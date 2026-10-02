"""Daily returns from deal history: opening balances, deposits, credit, partial closes, and nothing
but fractions and counts in what comes out."""
import unittest

import daystats
from daystats import BUY, SELL, BALANCE, CREDIT
from tests.fakes import Info, deal

IN, OUT = 0, 1


class DayRows(unittest.TestCase):
    def test_two_days_of_trades_after_a_deposit(self):
        deals = [
            deal('2026-09-25 09:00', BALANCE, profit=1000),
            deal('2026-09-28 08:00', BUY, IN, 1, commission=-3.5),
            deal('2026-09-28 09:00', SELL, OUT, 1, profit=50, commission=-3.5),
            deal('2026-09-28 10:00', SELL, IN, 2),
            deal('2026-09-28 11:00', BUY, OUT, 2, profit=-20),
            deal('2026-09-29 12:00', BUY, IN, 3, commission=-2),  # still open
        ]
        rows = daystats.day_rows(deals, {3}, balance=1021, report_from='2026-09-28')
        self.assertEqual([r['day'] for r in rows], ['2026-09-28', '2026-09-29'])
        first, second = rows
        self.assertAlmostEqual(first['ret'], 23 / 1000)
        self.assertEqual((first['trades'], first['won'], first['lost']), (2, 1, 1))
        self.assertAlmostEqual(first['gw'], 43 / 1000, msg='the entry\'s commission counts against the trade')
        self.assertAlmostEqual(first['gl'], 20 / 1000)
        self.assertAlmostEqual(second['ret'], -2 / 1023)
        self.assertEqual(second['trades'], 0, 'an open position isn\'t a trade yet')

    def test_a_deposit_adds_to_the_day_and_a_withdrawal_takes_nothing_off(self):
        deals = [
            deal('2026-09-01 09:00', BALANCE, profit=1000),
            deal('2026-09-28 07:00', BALANCE, profit=1000),
            deal('2026-09-28 08:00', BUY, IN, 1),
            deal('2026-09-28 09:00', SELL, OUT, 1, profit=100),
            deal('2026-09-29 07:00', BALANCE, profit=-500),
            deal('2026-09-29 08:00', BUY, IN, 2),
            deal('2026-09-29 09:00', SELL, OUT, 2, profit=100),
        ]
        rows = daystats.day_rows(deals, set(), balance=1700, report_from='2026-09-01')
        self.assertEqual([r['day'] for r in rows], ['2026-09-28', '2026-09-29'], 'a day with only money moving isn\'t a row')
        self.assertAlmostEqual(rows[0]['ret'], 100 / 2000)
        self.assertAlmostEqual(rows[1]['ret'], 100 / 2100)

    def test_credit_is_left_out(self):
        deals = [
            deal('2026-09-28 07:00', CREDIT, profit=500),
            deal('2026-09-28 08:00', BUY, IN, 1),
            deal('2026-09-28 09:00', SELL, OUT, 1, profit=10),
        ]
        rows = daystats.day_rows(deals, set(), balance=1010, report_from='2026-09-28')
        self.assertAlmostEqual(rows[0]['ret'], 10 / 1000)

    def test_a_position_closed_in_parts_is_one_trade_on_the_day_it_finished(self):
        deals = [
            deal('2026-09-28 08:00', BUY, IN, 7, commission=-1),
            deal('2026-09-28 09:00', SELL, OUT, 7, profit=10),
            deal('2026-09-29 09:00', SELL, OUT, 7, profit=5, swap=-0.5),
            deal('2026-09-29 10:00', BUY, IN, 8),
            deal('2026-09-29 11:00', SELL, OUT, 8, profit=7),  # part of 8 closed, the rest still open
        ]
        rows = {r['day']: r for r in daystats.day_rows(deals, {8}, balance=1020.5, report_from='2026-09-28')}
        self.assertEqual(rows['2026-09-28']['trades'], 0)
        self.assertAlmostEqual(rows['2026-09-28']['ret'], 9 / 1000)
        self.assertEqual((rows['2026-09-29']['trades'], rows['2026-09-29']['won']), (1, 1))
        self.assertAlmostEqual(rows['2026-09-29']['gw'], 13.5 / 1009)
        self.assertAlmostEqual(rows['2026-09-29']['ret'], 11.5 / 1009)

    def test_days_before_report_from_are_left_out_but_still_set_the_balance(self):
        deals = [deal(f'2026-09-{d} 09:00', SELL, OUT, d, profit=10) for d in (24, 25, 28)]
        rows = daystats.day_rows(deals, set(), balance=1030, report_from='2026-09-25')
        self.assertEqual([r['day'] for r in rows], ['2026-09-25', '2026-09-28'])
        self.assertAlmostEqual(rows[0]['ret'], 10 / 1010)

    def test_impossible_days_are_kept_in_range_or_skipped(self):
        huge = [deal('2026-09-28 09:00', SELL, OUT, 1, profit=5000)]
        self.assertEqual(daystats.day_rows(huge, set(), balance=5010, report_from='2026-09-01')[0]['ret'], 10.0)
        blown = [deal('2026-09-28 09:00', SELL, OUT, 1, profit=-150)]
        self.assertEqual(daystats.day_rows(blown, set(), balance=-50, report_from='2026-09-01')[0]['ret'], -1.0)
        nothing = [deal('2026-09-28 09:00', SELL, OUT, 1, profit=-10)]
        self.assertEqual(daystats.day_rows(nothing, set(), balance=-10, report_from='2026-09-01'), [], 'no balance to measure against')

    def test_only_fractions_and_counts_come_out(self):
        deals = [deal('2026-09-28 09:00', SELL, OUT, 1, profit=123.45)]
        for row in daystats.day_rows(deals, set(), balance=10123.45, report_from='2026-09-01'):
            self.assertEqual(set(row), {'day', 'ret', 'trades', 'won', 'lost', 'gw', 'gl'})
            for field in ('ret', 'gw', 'gl'):
                self.assertLess(abs(row[field]), 1)
            self.assertNotIn('123.45', repr(row))

    def test_open_trades_as_a_fraction_of_the_balance(self):
        self.assertAlmostEqual(daystats.open_fraction(Info(1, 's', 'c', 2, False, 1000, 1100, 50)), 0.05)
        self.assertIsNone(daystats.open_fraction(Info(1, 's', 'c', 2, False, 0, 50, 50)))


if __name__ == '__main__':
    unittest.main()
