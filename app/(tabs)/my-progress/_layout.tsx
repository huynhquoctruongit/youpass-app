import { Drawer } from "expo-router/drawer";
import { Dimensions } from "react-native";
import { StudyDrawerContent } from "@/components/study/drawer-menu";
import { StudyProgressProvider } from "@/contexts/study-progress-context";

const DRAWER_WIDTH = Dimensions.get("window").width;

export default function MyProgressDrawerLayout() {
  return (
    <StudyProgressProvider>
    <Drawer
      drawerContent={(props) => <StudyDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerPosition: "left",
        swipeEnabled: true,
        overlayColor: "rgba(0, 0, 0, 0.45)",
        drawerStyle: { width: DRAWER_WIDTH },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Tiến độ",
          drawerLabel: "Tiến độ học",
        }}
      />
    </Drawer>
    </StudyProgressProvider>
  );
}
