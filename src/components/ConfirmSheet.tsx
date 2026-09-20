import React from "react";
import { Modal, View, Text } from "react-native";
export default ({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) => (
  <Modal visible={visible} transparent>
    <View
      style={{
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "#00000033",
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          padding: 20,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <Text>{children}</Text>
      </View>
    </View>
  </Modal>
);
