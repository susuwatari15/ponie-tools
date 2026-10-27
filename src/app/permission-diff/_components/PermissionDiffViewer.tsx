import { ShieldCheck } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { usePermissionDiff } from "../_hooks/usePermissionDiff";
import { AllPermissionsSection } from "./AllPermissionsSection";
import { PermissionDiffInputPanel } from "./PermissionDiffInputPanel";
import { PermissionDiffSummaryToolbar } from "./PermissionDiffSummaryToolbar";
import { PermissionListSection } from "./PermissionListSection";
import { RoleBreakdownGrid } from "./RoleBreakdownGrid";

type PermissionDiffPane = "inputs" | "results";

export const PermissionDiffViewer: FC = () => {
	const {
		group1RawJson,
		setGroup1RawJson,
		group2RawJson,
		setGroup2RawJson,
		searchQuery,
		setSearchQuery,
		error,
		result,
		summary,
		allGroupItems,
		allGroupView,
		setAllGroupView,
		openSections,
		toggleSection,
		handleCompare,
		handleCopyJson,
		handleCopyText,
		loadSample,
	} = usePermissionDiff();

	// Below `lg` inputs and results are tabs; a fresh comparison shows its results.
	const [pane, setPane] = useState<PermissionDiffPane>("inputs");
	useEffect(() => {
		if (result) setPane("results");
	}, [result]);

	return (
		<div className="flex flex-col gap-3">
			<SegmentedControl
				value={pane}
				onChange={setPane}
				label="Permission diff panes"
				size="md"
				className="lg:hidden"
				options={[
					{ value: "inputs", label: "Inputs" },
					{ value: "results", label: "Results" },
				]}
			/>
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
				<PermissionDiffInputPanel
					className={pane === "inputs" ? undefined : "hidden lg:block"}
					group1RawJson={group1RawJson}
					group2RawJson={group2RawJson}
					error={error}
					onGroup1Change={setGroup1RawJson}
					onGroup2Change={setGroup2RawJson}
					onCompare={handleCompare}
					onLoadSample={loadSample}
				/>

				<section className={cn("min-w-0 space-y-4", pane === "results" ? undefined : "hidden lg:block")}>
					{result && summary ? (
						<>
							<PermissionDiffSummaryToolbar
								group1Label={result.group1.label}
								group2Label={result.group2.label}
								summary={summary}
								searchQuery={searchQuery}
								onSearchChange={setSearchQuery}
							/>

							<RoleBreakdownGrid
								group1Label={result.group1.label}
								group2Label={result.group2.label}
								group1Rows={result.group1.roleBreakdown}
								group2Rows={result.group2.roleBreakdown}
							/>

							<PermissionListSection
								id="only1"
								title="Only in Group 1"
								description={`${result.group1.label} permissions missing from ${result.group2.label}.`}
								items={result.onlyInGroup1}
								isOpen={openSections.only1}
								search={searchQuery}
								emptyMessage="No unique permissions in Group 1."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
							/>
							<PermissionListSection
								id="only2"
								title="Only in Group 2"
								description={`${result.group2.label} permissions missing from ${result.group1.label}.`}
								items={result.onlyInGroup2}
								isOpen={openSections.only2}
								search={searchQuery}
								emptyMessage="No unique permissions in Group 2."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
							/>
							<PermissionListSection
								id="common"
								title="Common (Intersection)"
								description="Permissions present in both groups."
								items={result.common}
								isOpen={openSections.common}
								search={searchQuery}
								emptyMessage="No shared permissions."
								onToggle={toggleSection}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
							/>

							<AllPermissionsSection
								group1Label={result.group1.label}
								group2Label={result.group2.label}
								shortModuleLabel={`All permissions — ${
									allGroupView === "group1" ? result.group1.label : result.group2.label
								}`}
								items={allGroupItems}
								searchQuery={searchQuery}
								isOpen={openSections.all}
								allGroupView={allGroupView}
								onToggle={() => toggleSection("all")}
								onGroupChange={setAllGroupView}
								onCopyJson={handleCopyJson}
								onCopyText={handleCopyText}
							/>
						</>
					) : (
						<EmptyState
							icon={ShieldCheck}
							title="No comparison yet"
							description="Paste two permission sets on the left and click Compare to see the intersection and differences."
						/>
					)}
				</section>
			</div>
		</div>
	);
};
