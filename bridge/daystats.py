"""Daily closed-trade returns from an MT5 account's deal history: fractions and counts only.

Each trading day gets one row. The day is the broker server's date, which for PU Prime and Vantage
ends at 17:00 New York, as the Quant Terminal's days do.

  ret     the day's profit and loss (closed trades, commissions, swaps and fees) over the balance at
          the start of the day plus that day's deposits. Withdrawals aren't taken off, so moving
          money never makes a day look better.
  trades  positions fully closed that day; won and lost by their net result, costs included
  gw, gl  those positions' gross wins and losses, as fractions of the same balance

No amount of money leaves this module.
"""
from collections import defaultdict
from datetime import datetime, timezone

# MT5's deal types and entries (MetaTrader5.DEAL_TYPE_* and DEAL_ENTRY_*).
BUY, SELL, BALANCE, CREDIT, CHARGE, CORRECTION, BONUS = 0, 1, 2, 3, 4, 5, 6
TRADES = {BUY, SELL}
FLOWS = {BALANCE, CORRECTION, BONUS}  # money paid in or out, not trading
CLOSING = {1, 2, 3}  # DEAL_ENTRY_OUT, DEAL_ENTRY_INOUT, DEAL_ENTRY_OUT_BY

# The terminal refuses a day outside these (−100% to +1,000%, gross up to 100 times the balance).
RET_RANGE = (-1.0, 10.0)
GROSS_MAX = 100.0


def server_day(seconds):
    """The broker server's date for a deal: MT5 gives times in server time, as seconds."""
    return datetime.fromtimestamp(seconds, timezone.utc).date().isoformat()


def amount(deal):
    """What a deal did to the balance: profit, commission, swap and fee together."""
    return (deal.profit or 0.0) + (deal.commission or 0.0) + (deal.swap or 0.0) + (getattr(deal, 'fee', 0.0) or 0.0)


def _clip(value, low, high):
    return max(low, min(high, value))


def day_rows(deals, open_positions, balance, report_from):
    """One row per trading day from report_from ('YYYY-MM-DD') on.

    deals           every deal from well before report_from until now (MT5's history_deals_get)
    open_positions  the ids of positions still open, whose trades aren't counted yet
    balance         the balance now, from which each day's opening balance is worked back
    """
    deals = sorted(deals, key=lambda d: (getattr(d, 'time_msc', 0) or d.time * 1000, d.ticket))
    days = defaultdict(lambda: {'pnl': 0.0, 'flows': 0.0})
    for d in deals:
        if d.type == CREDIT:  # credit (a bonus, say) moves the credit, not the balance
            continue
        days[server_day(d.time)]['flows' if d.type in FLOWS else 'pnl'] += amount(d)

    # Each day's opening balance: today's balance with every later deal taken back off.
    opening = {}
    running = balance
    for day in sorted(days, reverse=True):
        running -= days[day]['pnl'] + days[day]['flows']
        opening[day] = running

    # A trade is a position once it's fully closed, on the day of its last close, with everything
    # it cost and made (the entry's commission too).
    positions = defaultdict(list)
    for d in deals:
        if d.type in TRADES and d.position_id:
            positions[d.position_id].append(d)
    closed = defaultdict(list)
    for position, its in positions.items():
        closes = [d for d in its if d.entry in CLOSING]
        if not closes or position in open_positions:
            continue
        closed[server_day(closes[-1].time)].append(sum(amount(d) for d in its))

    rows = []
    for day in sorted(days):
        if day < report_from:
            continue
        base = opening[day] + max(days[day]['flows'], 0.0)
        nets = closed.get(day, [])
        pnl = days[day]['pnl']
        if base <= 0 or (not nets and abs(pnl) < 1e-9):
            continue
        wins = sum(n for n in nets if n > 0)
        losses = -sum(n for n in nets if n < 0)
        rows.append({
            'day': day,
            'ret': round(_clip(pnl / base, *RET_RANGE), 8),
            'trades': len(nets),
            'won': sum(1 for n in nets if n > 0),
            'lost': sum(1 for n in nets if n < 0),
            'gw': round(_clip(wins / base, 0.0, GROSS_MAX), 8),
            'gl': round(_clip(losses / base, 0.0, GROSS_MAX), 8),
        })
    return rows


def open_fraction(info):
    """What open trades stand at, as a fraction of the balance (credit left out), or None."""
    if not info.balance or info.balance <= 0:
        return None
    return round(_clip((info.equity - info.balance - (info.credit or 0.0)) / info.balance, *RET_RANGE), 6)
