import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout";
import { PermissionDiffPage } from "./features/permission-diff/PermissionDiffPage";
import { SwaggerComparePage } from "./features/swagger-compare/SwaggerComparePage";
import { SwaggerMinifierPage } from "./features/swagger-minifier/SwaggerMinifierPage";

const App = () => {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route index element={<SwaggerMinifierPage />} />
				<Route path="swagger-compare" element={<SwaggerComparePage />} />
				<Route path="permission-diff" element={<PermissionDiffPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
};

export default App;
