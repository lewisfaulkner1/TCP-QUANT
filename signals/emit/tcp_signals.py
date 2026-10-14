"""Write TCP signal events for the publisher to post. Standard library only.

The trading engine calls this; the publisher (signals/src) picks the files up and posts them.
Nothing here places trades or talks to a broker. The event format is in signals/EVENTS.md.

    from tcp_signals import Outbox

    box = Outbox(r"C:\\tcp\\signals\\outbox")
    sid = box.open(strategy="QT1", instrument="XAUUSD", side="buy",
                   entry=3742.50, sl=3727.50, tp=3772.50)
    box.update(sid, "sl_moved", price=3742.50)   # stop to breakeven
    box.update(sid, "tp")                         # target hit
"""
from __future__ import annotations

import datetime as _dt
import itertools
import json
import os
import re
import threading

__all__ = ["Outbox"]

UPDATE_EVENTS = ("tp", "tp2", "sl", "be", "closed", "sl_moved", "cancelled")
_counter = itertools.count(1)
_lock = threading.Lock()


def _utc(t):
    if t is None:
        return _dt.datetime.now(_dt.timezone.utc)
    if t.tzinfo is None:
        raise ValueError("time must be timezone-aware (e.g. datetime.now(timezone.utc))")
    return t.astimezone(_dt.timezone.utc)


def _iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%S.") + f"{t.microsecond // 1000:03d}Z"


class Outbox:
    """A folder the publisher watches. Each event becomes one JSON file, written atomically."""

    def __init__(self, path: str):
        self.path = os.path.abspath(path)
        os.makedirs(self.path, exist_ok=True)

    def open(self, *, strategy: str, instrument: str, side: str, entry: float, sl: float, tp,
             order: str = "market", time: _dt.datetime | None = None, id: str | None = None,
             decimals: int | None = None, note: str | None = None) -> str:
        """Announce a new signal. Returns its id, which every later update must use."""
        t = _utc(time)
        tps = [float(x) for x in (tp if isinstance(tp, (list, tuple)) else [tp])]
        entry, sl = float(entry), float(sl)
        if side not in ("buy", "sell"):
            raise ValueError("side must be 'buy' or 'sell'")
        if order not in ("market", "limit", "stop"):
            raise ValueError("order must be 'market', 'limit' or 'stop'")
        up = side == "buy"
        if not tps or len(tps) > 2:
            raise ValueError("tp must be one or two prices")
        if (sl >= entry) if up else (sl <= entry):
            raise ValueError(f"for a {side}, sl must be {'below' if up else 'above'} entry")
        if (tps[0] <= entry) if up else (tps[0] >= entry):
            raise ValueError(f"for a {side}, tp must be {'above' if up else 'below'} entry")
        sid = id or f"{strategy}-{instrument.upper()}-{t.strftime('%Y%m%dT%H%M%S')}"
        ev = {"v": 1, "type": "open", "id": sid, "strategy": strategy, "instrument": instrument.upper(),
              "side": side, "order": order, "entry": entry, "sl": sl, "tp": tps, "time": _iso(t)}
        if decimals is not None:
            ev["decimals"] = int(decimals)
        if note:
            ev["note"] = str(note)[:420]
        self._write(ev)
        return sid

    def update(self, id: str, event: str, *, price: float | None = None, r: float | None = None,
               time: _dt.datetime | None = None) -> None:
        """Report what happened to a signal: tp, tp2, sl, be, closed, sl_moved or cancelled."""
        if event not in UPDATE_EVENTS:
            raise ValueError(f"event must be one of {', '.join(UPDATE_EVENTS)}")
        if event == "sl_moved" and price is None:
            raise ValueError("sl_moved needs price (the new stop)")
        if event == "closed" and price is None and r is None:
            raise ValueError("closed needs price or r")
        ev = {"v": 1, "type": "update", "id": id, "event": event, "time": _iso(_utc(time))}
        if price is not None:
            ev["price"] = float(price)
        if r is not None:
            ev["r"] = float(r)
        self._write(ev)

    def _write(self, ev: dict) -> None:
        # Named by write time, so the publisher handles events in the order they were emitted.
        with _lock:
            n = next(_counter)
            now = _dt.datetime.now(_dt.timezone.utc)
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", ev["id"])[:60]
        name = f"{now.strftime('%Y%m%dT%H%M%S%f')}-{os.getpid()}-{n:05d}-{ev['type']}-{safe}.json"
        tmp = os.path.join(self.path, name + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(ev, f)
        os.replace(tmp, os.path.join(self.path, name))
