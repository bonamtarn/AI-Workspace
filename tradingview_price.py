"""
TradingView Price Data Fetcher
ดึงข้อมูลราคา OHLCV จาก TradingView ผ่าน tvdatafeed
"""

import time
import logging
from tvDatafeed import TvDatafeed, Interval
import pandas as pd

logging.getLogger("tvDatafeed").setLevel(logging.WARNING)

INTERVALS = {
    "1m":  Interval.in_1_minute,
    "3m":  Interval.in_3_minute,
    "5m":  Interval.in_5_minute,
    "15m": Interval.in_15_minute,
    "30m": Interval.in_30_minute,
    "1h":  Interval.in_1_hour,
    "2h":  Interval.in_2_hour,
    "4h":  Interval.in_4_hour,
    "1d":  Interval.in_daily,
    "1w":  Interval.in_weekly,
    "1M":  Interval.in_monthly,
}

_tv = None

def _get_client() -> TvDatafeed:
    global _tv
    if _tv is None:
        _tv = TvDatafeed()
        time.sleep(1.5)  # รอ WebSocket เชื่อมต่อ
    return _tv


def get_price(symbol: str, exchange: str = "BINANCE", interval: str = "1h", bars: int = 500, retries: int = 3) -> pd.DataFrame:
    """
    ดึงข้อมูล OHLCV จาก TradingView

    Args:
        symbol:   เช่น "BTCUSDT", "ETHUSDT", "AAPL", "AOT"
        exchange: เช่น "BINANCE", "NYSE", "SET" (ตลาดไทย)
        interval: "1m","5m","15m","30m","1h","2h","4h","1d","1w","1M"
        bars:     จำนวน candle (สูงสุด ~5000)
        retries:  จำนวนครั้งที่ retry ถ้าเชื่อมต่อล้มเหลว

    Returns:
        DataFrame คอลัมน์: open, high, low, close, volume
    """
    tf = INTERVALS.get(interval)
    if tf is None:
        raise ValueError(f"interval ไม่ถูกต้อง เลือกได้จาก: {list(INTERVALS.keys())}")

    for attempt in range(retries):
        try:
            tv = _get_client()
            df = tv.get_hist(symbol=symbol, exchange=exchange, interval=tf, n_bars=bars)
            if df is not None and not df.empty:
                df = df.drop(columns=["symbol"], errors="ignore")
                return df
        except Exception:
            pass

        global _tv
        _tv = None  # reset client แล้ว retry
        time.sleep(2)

    raise RuntimeError(f"ไม่สามารถดึงข้อมูล {symbol}:{exchange} ได้ (ลอง {retries} ครั้งแล้ว)")


def get_latest(symbol: str, exchange: str = "BINANCE") -> dict:
    """ดึง OHLCV candle ล่าสุด"""
    df = get_price(symbol, exchange, interval="1m", bars=2)
    row = df.iloc[-1]
    return {
        "symbol":   symbol,
        "exchange": exchange,
        "time":     df.index[-1].isoformat(),
        "open":     round(float(row["open"]),  6),
        "high":     round(float(row["high"]),  6),
        "low":      round(float(row["low"]),   6),
        "close":    round(float(row["close"]), 6),
        "volume":   round(float(row["volume"]), 4),
    }


# ---- ทดสอบ ----
if __name__ == "__main__":
    examples = [
        ("BTCUSDT",  "BINANCE", "4h",  10),
        ("ETHUSDT",  "BINANCE", "1h",  5),
        ("AOT",      "SET",     "1d",  5),
    ]

    for symbol, exchange, tf, bars in examples:
        print(f"\n=== {symbol} [{exchange}] | {tf} | {bars} แท่ง ===")
        try:
            df = get_price(symbol, exchange, interval=tf, bars=bars)
            print(df.to_string())
            latest = df.iloc[-1]
            print(f">> ราคาล่าสุด: {latest['close']:.4f}")
        except Exception as e:
            print(f"  [ข้าม] {e}")
