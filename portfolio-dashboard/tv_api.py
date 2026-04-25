"""
TradingView History API Server
ให้ข้อมูล OHLCV daily ผ่าน HTTP สำหรับ portfolio-dashboard
รัน: python tv_api.py  (port 8001)
"""

import time
import logging
from datetime import date, timedelta
import requests as req_lib
from flask import Flask, jsonify, request
from flask_cors import CORS
from tvDatafeed import TvDatafeed, Interval

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)
logging.getLogger("tvDatafeed").setLevel(logging.WARNING)

app = Flask(__name__)
CORS(app)

# symbol → (tv_symbol, exchange, currency)
# currency: 'USD' จะ × usdthb / 'THB' ไม่ต้องแปลง
TV_MAP = {
    'BTC':   ('BTCUSDT',   'BINANCE',  'USD'),
    'ETH':   ('ETHUSDT',   'BINANCE',  'USD'),
    'SOL':   ('SOLUSDT',   'BINANCE',  'USD'),
    'BNB':   ('BNBUSDT',   'BINANCE',  'USD'),
    'XRP':   ('XRPUSDT',   'BINANCE',  'USD'),
    'ADA':   ('ADAUSDT',   'BINANCE',  'USD'),
    'AVAX':  ('AVAXUSDT',  'BINANCE',  'USD'),
    'LINK':  ('LINKUSDT',  'BINANCE',  'USD'),
    'DOT':   ('DOTUSDT',   'BINANCE',  'USD'),
    'MATIC': ('MATICUSDT', 'BINANCE',  'USD'),
    'XAUT':  ('XAUTUSDT',  'BINANCE',  'USD'),
    'PAXG':  ('PAXGUSDT',  'BINANCE',  'USD'),
    'SCB':   ('SCB',       'SET',      'THB'),
    'KKP':   ('KKP',       'SET',      'THB'),
    'KBANK': ('KBANK',     'SET',      'THB'),
    'TISCO': ('TISCO',     'SET',      'THB'),
    'KTB':   ('KTB',       'SET',      'THB'),
    'PTT':   ('PTT',       'SET',      'THB'),
    'AOT':   ('AOT',       'SET',      'THB'),
    'IVV':   ('IVV',       'AMEX',     'USD'),
    'QQQM':  ('QQQM',      'NASDAQ',   'USD'),
    'SPY':   ('SPY',       'AMEX',     'USD'),
    'QQQ':   ('QQQ',       'NASDAQ',   'USD'),
}

_tv_client = None
_cache: dict = {}
CACHE_TTL = 300  # 5 minutes

# ---- WealthMagik (mutual fund NAV) ----
WM_API    = 'https://restapi.wealthmagik.com'
WM_CLIENT = '0324E43A029B34CDC026148C8EF5492FC9290765E7497EDD40B30B0611AAF00B'
WM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer':    'https://www.wealthmagik.com/',
    'Accept':     'application/json',
    'clientid':   WM_CLIENT,
}
_wm_sec_id_cache: dict = {}  # fundCode → securityID


def get_tv() -> TvDatafeed:
    global _tv_client
    if _tv_client is None:
        _tv_client = TvDatafeed()
        time.sleep(1.5)
    return _tv_client


def fetch_raw(symbol: str, bars: int) -> list | None:
    """Fetch raw [[ts_ms, close_price]] — price in original currency (no THB conversion)."""
    global _tv_client
    tv_symbol, exchange, _ = TV_MAP[symbol]

    for attempt in range(3):
        try:
            df = get_tv().get_hist(symbol=tv_symbol, exchange=exchange,
                                   interval=Interval.in_daily, n_bars=bars)
            if df is not None and not df.empty:
                df = df.drop(columns=['symbol'], errors='ignore')
                return [
                    [int(ts.timestamp() * 1000), float(row['close'])]
                    for ts, row in df.iterrows()
                    if row['close'] > 0
                ]
        except Exception as e:
            log.warning(f"Attempt {attempt+1} failed for {symbol}: {e}")
        _tv_client = None
        time.sleep(2)

    return None


@app.route('/history')
def history():
    symbol  = request.args.get('symbol', '').upper()
    usdthb  = float(request.args.get('usdthb', 33.5))
    bars    = int(request.args.get('bars', 1825))

    if symbol not in TV_MAP:
        return jsonify({'error': f'{symbol} ไม่รองรับ'}), 404

    cache_key = f"{symbol}:{bars}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached['ts'] < CACHE_TTL:
        raw = cached['raw']
        factor = usdthb if TV_MAP[symbol][2] == 'USD' else 1.0
        return jsonify({'data': [[r[0], r[1] * factor] for r in raw]})

    raw = fetch_raw(symbol, bars)
    if raw is None:
        return jsonify({'error': f'ไม่สามารถดึงข้อมูล {symbol} จาก TradingView'}), 503

    _cache[cache_key] = {'raw': raw, 'ts': time.time()}

    factor = usdthb if TV_MAP[symbol][2] == 'USD' else 1.0
    return jsonify({'data': [[r[0], r[1] * factor] for r in raw]})


def _wm_get_security_id(fund_code: str) -> int | None:
    if fund_code in _wm_sec_id_cache:
        return _wm_sec_id_cache[fund_code]
    try:
        r = req_lib.get(f'{WM_API}/fundinfo/GetSecurityIDByFundCode?fundCode={fund_code}',
                        headers=WM_HEADERS, timeout=10)
        if r.status_code == 200:
            sid = int(r.text.strip().strip('"'))
            _wm_sec_id_cache[fund_code] = sid
            return sid
    except Exception as e:
        log.warning(f"WM securityID lookup failed for {fund_code}: {e}")
    return None


@app.route('/wm-history')
def wm_history():
    fund_code = request.args.get('fund', '').upper()
    if not fund_code:
        return jsonify({'error': 'missing fund parameter'}), 400

    cache_key = f"wm:{fund_code}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached['ts'] < CACHE_TTL:
        return jsonify({'data': cached['data']})

    sec_id = _wm_get_security_id(fund_code)
    if sec_id is None:
        return jsonify({'error': f'ไม่พบ securityID สำหรับ {fund_code}'}), 404

    from_date = (date.today() - timedelta(days=1825)).strftime('%Y%m%d')
    try:
        r = req_lib.get(f'{WM_API}/fundinfo/GetFundPriceList?securityID={sec_id}&fromDate={from_date}',
                        headers=WM_HEADERS, timeout=15)
        if not r.ok:
            return jsonify({'error': f'WealthMagik API error {r.status_code}'}), 502

        rows = r.json()
        data = []
        for row in rows:
            nav = row.get('NAV')
            nav_date = row.get('NAVDate', '')
            if nav is None or not nav_date:
                continue
            try:
                d = date(int(nav_date[:4]), int(nav_date[4:6]), int(nav_date[6:8]))
                ts_ms = int((d - date(1970, 1, 1)).total_seconds()) * 1000
                data.append([ts_ms, float(nav)])
            except Exception:
                continue

        _cache[cache_key] = {'data': data, 'ts': time.time()}
        return jsonify({'data': data})

    except Exception as e:
        log.error(f"WM history error for {fund_code}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/ping')
def ping():
    return jsonify({'ok': True, 'symbols': list(TV_MAP.keys())})


if __name__ == '__main__':
    log.info("TradingView API listening on http://localhost:8001")
    app.run(host='0.0.0.0', port=8001, debug=False)
