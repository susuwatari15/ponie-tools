import { ShieldCheck } from "lucide-react";
import type { FC } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePermissionDiff } from "../_hooks/usePermissionDiff";
import { AllPermissionsSection } from "./AllPermissionsSection";
import { PermissionDiffInputPanel } from "./PermissionDiffInputPanel";
import { PermissionDiffSummaryToolbar } from "./PermissionDiffSummaryToolbar";
import { PermissionListSection } from "./PermissionListSection";
import { RoleBreakdownGrid } from "./RoleBreakdownGrid";

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

	return (
		<div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
			<PermissionDiffInputPanel
				group1RawJson={group1RawJson}
				group2RawJson={group2RawJson}
				error={error}
				onGroup1Change={setGroup1RawJson}
				onGroup2Change={setGroup2RawJson}
				onCompare={handleCompare}
				onLoadSample={loadSample}
			/>

			<section className="min-w-0 space-y-4">
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
	);
};
