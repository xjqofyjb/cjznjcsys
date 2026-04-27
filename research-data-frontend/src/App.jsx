import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { LoginModal } from "./auth/LoginModal";
import { useAuthController } from "./auth/useAuth";
import { AppFooter, AppTopBar } from "./shared-ui/components";
import { labs, labMap } from "./labs/data";
import { HomePage } from "./labs/HomePage";
import { LabPage } from "./labs/LabPage";
import { resourceCenters, resourceCenterMap } from "./resource-centers/config";
import { ResourceCenterPage } from "./resource-centers/ResourceCenterPage";
import { DataCenter } from "./upload/DataCenter";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const auth = useAuthController();

  useEffect(() => {
    document.title = "长江三峡实验室数据中枢";
  }, []);

  const resourceItems = useMemo(
    () =>
      resourceCenters.map((item) => ({
        key: item.key,
        label: item.label,
        iconType: item.iconType,
        subtitle: item.title,
      })),
    [],
  );

  function handleNavigate(nextTab) {
    if (nextTab === "data" && !auth.authed) {
      setShowLogin(true);
      return;
    }

    setActiveTab(nextTab);
  }

  function renderPage() {
    if (activeTab === "home") {
      return (
        <HomePage
          onEnterLab={setActiveTab}
          onEnterResource={setActiveTab}
          onOpenDataCenter={() => handleNavigate("data")}
        />
      );
    }

    if (activeTab === "data") {
      return <DataCenter auth={auth} />;
    }

    if (labMap[activeTab]) {
      return <LabPage lab={labMap[activeTab]} />;
    }

    if (resourceCenterMap[activeTab]) {
      return <ResourceCenterPage config={resourceCenterMap[activeTab]} auth={auth} onRequireAuth={() => setShowLogin(true)} />;
    }

    return <HomePage onEnterLab={setActiveTab} onEnterResource={setActiveTab} onOpenDataCenter={() => handleNavigate("data")} />;
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop app-backdrop--one" />
      <div className="app-backdrop app-backdrop--two" />
      <div className="app-backdrop app-backdrop--three" />

      <AppTopBar
        active={activeTab}
        onNavigate={handleNavigate}
        onOpenLogin={() => setShowLogin(true)}
        authedUser={auth.user?.displayName || auth.user?.email || ""}
        onLogout={auth.logout}
        resourceItems={resourceItems}
        labs={labs}
      />

      <main className="app-main">{renderPage()}</main>
      <AppFooter />

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} auth={auth} />
    </div>
  );
}
