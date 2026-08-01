"use client";

/* ═══════════════════════════════════════════════════════════════
   PIPELINE STRIP · VARIANTS (dev-ui only)

   Scratch pad for choosing what the desktop hub's "Pipeline" row
   should measure now that quotes have real stages and projects
   have real payments. Two of the four cells it shipped with aren't
   pipeline at all: "Avg. project" is a vanity stat derived from
   the old paid-flag basis, and "Clients" is a roster size.

   Rendered side by side in /dev-ui with the same mock numbers so
   the choice is made by looking, not by reading a description.
   Delete this file once a variant is picked.
   ═══════════════════════════════════════════════════════════════ */

import { Tile, Cols, Col } from "@/components/desktop/ui";
import { formatMoney } from "@/lib/currency";

/** One plausible month: two quotes out, two jobs running, one with a
 *  deposit in, one with nothing. */
export const MOCK = {
  outstanding: 128_400,   // sent quotes awaiting reply
  sentCount: 2,
  activeValue: 130_632,   // agreed price of active projects
  activeCount: 2,
  owed: 100_632,          // price minus payments, across active
  noDepositCount: 1,
  collectedMonth: 30_000, // payments dated this month
  paidCount: 1,
  avgProject: 62_500,
  clients: 3,
};

const m = (n: number) => (n > 0 ? formatMoney(n) : "—");

/** What ships today, for reference. */
export function StripCurrent() {
  return (
    <Tile label="Pipeline · current" className="py-1">
      <Cols>
        <Col value={m(MOCK.outstanding)} label="Outstanding" sub={`${MOCK.sentCount} awaiting reply`} />
        <Col value={String(MOCK.activeCount)} label="Active projects" sub="in progress" />
        <Col value={m(MOCK.avgProject)} label="Avg. project" sub="from paid work" />
        <Col value={String(MOCK.clients)} label="Clients" sub="in your roster" />
      </Cols>
    </Tile>
  );
}

/** A: the money's journey. Left to right = the stepper's order. */
export function StripMoneyJourney() {
  return (
    <Tile label="A · the money's journey" className="py-1">
      <Cols>
        <Col value={m(MOCK.outstanding)} label="Awaiting reply" sub={`${MOCK.sentCount} quotes out`} />
        <Col value={m(MOCK.activeValue)} label="In progress" sub={`${MOCK.activeCount} projects`} />
        <Col value={m(MOCK.owed)} label="Owed to you" sub={`${MOCK.noDepositCount} without deposit`} />
        <Col value={m(MOCK.collectedMonth)} label="Collected" sub="this month" />
      </Cols>
    </Tile>
  );
}

/** B: same, but the roster stays on the hub. */
export function StripKeepClients() {
  return (
    <Tile label="B · keeps clients" className="py-1">
      <Cols>
        <Col value={m(MOCK.outstanding)} label="Awaiting reply" sub={`${MOCK.sentCount} quotes out`} />
        <Col value={m(MOCK.activeValue)} label="In progress" sub={`${MOCK.activeCount} projects`} />
        <Col value={m(MOCK.owed)} label="Owed to you" sub={`${MOCK.noDepositCount} without deposit`} />
        <Col value={String(MOCK.clients)} label="Clients" sub="in your roster" />
      </Cols>
    </Tile>
  );
}

/** C: counts lead, money is the supporting line. Reads faster, says less. */
export function StripCountsFirst() {
  return (
    <Tile label="C · counts lead" className="py-1">
      <Cols>
        <Col value={String(MOCK.sentCount)} label="Quotes out" sub={m(MOCK.outstanding)} />
        <Col value={String(MOCK.activeCount)} label="Active projects" sub={m(MOCK.activeValue)} />
        <Col value={String(MOCK.noDepositCount)} label="Unpaid deposits" sub={m(MOCK.owed)} />
        <Col value={String(MOCK.paidCount)} label="Paid this month" sub={m(MOCK.collectedMonth)} />
      </Cols>
    </Tile>
  );
}

/** D: three cells instead of four. Drops "awaiting reply" (it's already the
 *  quotes table right below) to give the remaining numbers more room. */
export function StripThree() {
  return (
    <Tile label="D · three, wider" className="py-1">
      <Cols>
        <Col value={m(MOCK.activeValue)} label="In progress" sub={`${MOCK.activeCount} projects`} />
        <Col value={m(MOCK.owed)} label="Owed to you" sub={`${MOCK.noDepositCount} without deposit`} />
        <Col value={m(MOCK.collectedMonth)} label="Collected" sub="this month" />
      </Cols>
    </Tile>
  );
}
