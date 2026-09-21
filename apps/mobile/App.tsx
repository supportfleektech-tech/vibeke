import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: "#060b0b", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#10b981", fontSize: 24, fontWeight: "900" }}>KINARA</Text>
      <Text style={{ color: "#f1f5f9", marginTop: 8 }}>Sovereign Mobile — Expo scaffold ready</Text>
      <Text style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}>Shares types/validators/tokens from web</Text>
    </View>
  );
}
