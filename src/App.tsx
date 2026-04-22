import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { PermissionDiffPlaceholder } from "./components/PermissionDiffPlaceholder";
import { SwaggerCompareWorkspace } from "./components/SwaggerCompareWorkspace";
import { SwaggerWorkspace } from "./components/SwaggerWorkspace";

const App = () => {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route index element={<SwaggerWorkspace />} />
				<Route path="swagger-compare" element={<SwaggerCompareWorkspace />} />
				<Route path="permission-diff" element={<PermissionDiffPlaceholder />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
};

export default App;
