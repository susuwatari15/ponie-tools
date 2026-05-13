import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { SwaggerComparePanel } from "./components/SwaggerComparePanel";
import { mutedText, panelClasses, themeClasses } from "./styles";
import type { SavedSnapshot } from "../../utils/swaggerSavedSnapshotsStorage";
import { listSnapshots } from "../../utils/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "../../utils/swaggerRawJsonStorage";

export const SwaggerComparePage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);

  const comparePreset =
    typeof location.state === "object" &&
    location.state !== null &&
    "compareSnapshotIds" in location.state &&
    typeof (location.state as { compareSnapshotIds: unknown })
      .compareSnapshotIds === "object" &&
    (
      location.state as {
        compareSnapshotIds: { versionA?: unknown; versionB?: unknown };
      }
    ).compareSnapshotIds !== null
      ? (
          location.state as {
            compareSnapshotIds: { versionA: string; versionB: string };
          }
        ).compareSnapshotIds
      : undefined;

  const refreshSnapshots = useCallback(() => {
    setSnapshots(listSnapshots());
  }, []);

  useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots]);

  const handleLoadSnapshot = (rawJson: string) => {
    writeRawJsonToStorage(rawJson);
  };

  return (
    <div className={`w-full space-y-4 p-4 lg:p-4 ${themeClasses}`}>
      <PageHeader
        title="Swagger Compare"
        titleAs="h1"
        titleClassName="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        description="Compare two saved snapshots to see added, removed, and changed endpoints."
        descriptionClassName={`text-sm ${mutedText}`}
        wrapperClassName={`rounded-xl border px-4 py-3 ${panelClasses}`}
      />

      <SwaggerComparePanel
        snapshots={snapshots}
        onSnapshotsChange={refreshSnapshots}
        onLoadSnapshot={handleLoadSnapshot}
        onSwitchToMinifier={() => navigate("/")}
        initialSnapshotIdA={comparePreset?.versionA ?? ""}
        initialSnapshotIdB={comparePreset?.versionB ?? ""}
      />
    </div>
  );
};
