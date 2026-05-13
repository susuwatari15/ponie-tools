import type { FC } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { PermissionDiffViewer } from "./components/PermissionDiffViewer";
import { mutedText, panelClasses, themeClasses } from "./styles";

export const PermissionDiffPage: FC = () => {
  return (
    <div className={`w-full space-y-4 p-4 lg:p-6 ${themeClasses}`}>
      <PageHeader
        wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
        title="Permission Diff Viewer"
        description="Compare permissions across two role groups from raw JSON."
        titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        descriptionClassName={`text-sm ${mutedText}`}
      />
      <PermissionDiffViewer />
    </div>
  );
};
