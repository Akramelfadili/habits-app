import { act, renderHook } from "@testing-library/react-native";
import { useCallback } from "react";
import {
	createSharedLiveTable,
	sameElements,
	useSharedLiveTable,
} from "./shared-live-table";
import { activeListenerCount, notifyTableChanged } from "./test-live-query";

type Row = { id: number; group: string; label: string };

let mockRows: Row[] = [];
const read = jest.fn(() =>
	Promise.resolve(mockRows.map((row) => ({ ...row }))),
);

function makeTable() {
	return createSharedLiveTable({
		table: "things",
		read,
		map: (row: Row) => row,
		key: (row) => row.id,
		same: (a, b) => a.group === b.group && a.label === b.label,
	});
}

function useGroup(
	table: ReturnType<typeof makeTable>,
	group: string,
	renders: { count: number },
) {
	renders.count += 1;
	const select = useCallback(
		(rows: Row[]) => rows.filter((row) => row.group === group),
		[group],
	);
	return useSharedLiveTable(table, select, sameElements);
}

async function write(next: Row[]) {
	mockRows = next;
	await act(async () => {
		notifyTableChanged("things");
	});
}

beforeEach(() => {
	mockRows = [
		{ id: 1, group: "a", label: "one" },
		{ id: 2, group: "b", label: "two" },
	];
	read.mockClear();
});

describe("shared live table", () => {
	it("opens one query and one listener however many consumers there are", async () => {
		const table = makeTable();
		const before = activeListenerCount();
		const renders = { count: 0 };
		const consumers = [];
		for (const group of ["a", "b", "a", "b", "a"]) {
			consumers.push(await renderHook(() => useGroup(table, group, renders)));
		}
		await act(async () => {});

		expect(read).toHaveBeenCalledTimes(1);
		expect(activeListenerCount() - before).toBe(1);
		expect(consumers[0]?.result.current.map((row) => row.id)).toEqual([1]);
		expect(consumers[1]?.result.current.map((row) => row.id)).toEqual([2]);

		await write([...mockRows, { id: 3, group: "a", label: "three" }]);
		// One re-read for the write, not one per consumer.
		expect(read).toHaveBeenCalledTimes(2);
		expect(consumers[2]?.result.current.map((row) => row.id)).toEqual([1, 3]);
		for (const consumer of consumers) await consumer.unmount();
	});

	it("closes the listener when the last consumer unmounts, and starts fresh for the next", async () => {
		const table = makeTable();
		const before = activeListenerCount();
		const renders = { count: 0 };
		const first = await renderHook(() => useGroup(table, "a", renders));
		const second = await renderHook(() => useGroup(table, "b", renders));
		expect(activeListenerCount() - before).toBe(1);

		await first.unmount();
		expect(activeListenerCount() - before).toBe(1);
		await second.unmount();
		expect(activeListenerCount() - before).toBe(0);

		// A write while nobody listens reads nothing.
		const reads = read.mock.calls.length;
		await write([{ id: 9, group: "a", label: "nine" }]);
		expect(read).toHaveBeenCalledTimes(reads);

		// The next consumer subscribes again and sees the table as it is now.
		const next = await renderHook(() => useGroup(table, "a", renders));
		await act(async () => {});
		expect(next.result.current.map((row) => row.id)).toEqual([9]);
		expect(read).toHaveBeenCalledTimes(reads + 1);
		await next.unmount();
	});

	it("does not re-render a consumer whose slice did not change after an unrelated write", async () => {
		const table = makeTable();
		const aRenders = { count: 0 };
		const bRenders = { count: 0 };
		const a = await renderHook(() => useGroup(table, "a", aRenders));
		const b = await renderHook(() => useGroup(table, "b", bRenders));
		await act(async () => {});
		const aBefore = aRenders.count;
		const bBefore = bRenders.count;
		const aSlice = a.result.current;

		await write([...mockRows, { id: 3, group: "b", label: "three" }]);

		expect(aRenders.count).toBe(aBefore);
		expect(a.result.current).toBe(aSlice);
		expect(bRenders.count).toBeGreaterThan(bBefore);
		expect(b.result.current.map((row) => row.id)).toEqual([2, 3]);
		await a.unmount();
		await b.unmount();
	});

	it("keeps the same rows, and re-renders nobody, when a write changed nothing", async () => {
		const table = makeTable();
		const renders = { count: 0 };
		const consumer = await renderHook(() => useGroup(table, "a", renders));
		await act(async () => {});
		const rendersBefore = renders.count;
		const rowsBefore = table.getSnapshot().rows;

		await write(mockRows.map((row) => ({ ...row })));

		expect(table.getSnapshot().rows).toBe(rowsBefore);
		expect(renders.count).toBe(rendersBefore);
		await consumer.unmount();
	});

	it("carries an unchanged row's object over and replaces a changed one", async () => {
		const table = makeTable();
		const renders = { count: 0 };
		const consumer = await renderHook(() => useGroup(table, "a", renders));
		await act(async () => {});
		const [kept, changed] = table.getSnapshot().rows;

		await write([
			{ id: 1, group: "a", label: "one" },
			{ id: 2, group: "b", label: "TWO" },
		]);

		const rows = table.getSnapshot().rows;
		expect(rows[0]).toBe(kept);
		expect(rows[1]).not.toBe(changed);
		expect(rows[1]?.label).toBe("TWO");
		await consumer.unmount();
	});

	it("reports not loaded until the first result, and keeps a failed read", async () => {
		const table = makeTable();
		const unsubscribe = table.subscribe(() => {});
		expect(table.getSnapshot()).toMatchObject({ rows: [], loaded: false });
		await act(async () => {});
		expect(table.getSnapshot().loaded).toBe(true);

		read.mockRejectedValueOnce(new Error("disk"));
		await act(async () => {
			notifyTableChanged("things");
		});
		expect(table.getSnapshot().error).toEqual(new Error("disk"));
		unsubscribe();
	});

	it("drops a result that arrives after the last consumer left", async () => {
		const table = makeTable();
		let resolve: (rows: Row[]) => void = () => {};
		read.mockImplementationOnce(
			() => new Promise<Row[]>((done) => (resolve = done)),
		);
		const unsubscribe = table.subscribe(() => {});
		unsubscribe();
		await act(async () => resolve(mockRows));
		expect(table.getSnapshot()).toMatchObject({ rows: [], loaded: false });
	});
});
