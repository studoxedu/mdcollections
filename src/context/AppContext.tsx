import React, { createContext, useContext, useEffect, useState } from "react";
import { q, run, tx } from "../database/client";
import { uuid, now } from "../utils/id";
import {
  hasGoogleAuth,
  signInSilentlyWithGoogle,
} from "../services/googleAuth";
import { getDeviceId } from "../services/auth";
import { setCurrentSession } from "../services/session";
import { restoreFromCloud } from "../services/restore";
import { getCachedBusinessFolderId } from "../services/businessFolder";
import { useAutoSync } from "../sync/trigger";
const C = createContext<any>(null);
export const useApp = () => useContext(C);
const cats = [
  "Shoes",
  "Jallabiya",
  "Jerseys",
  "Caps",
  "Underwear",
  "Perfumes",
  "Cufflinks",
  "Accessories",
];
const products = [
  ["Nike Air Force 1 (White, 42)", "SH-001", "Shoes", 28000, 42000, 6, 3],
  ["Adidas Samba (Black, 43)", "SH-002", "Shoes", 32000, 48000, 3, 3],
  ["Men's Leather Loafers (Brown, 41)", "SH-003", "Shoes", 22000, 35000, 12, 4],
  ["Moroccan Jallabiya (Cream, L)", "JB-001", "Jallabiya", 12000, 22000, 9, 3],
  [
    "Embroidered Jallabiya (Navy, XL)",
    "JB-002",
    "Jallabiya",
    18000,
    32000,
    0,
    3,
  ],
  ["Dubai Jersey (Home, M)", "JS-001", "Jerseys", 6500, 12000, 24, 10],
  ["Arsenal Jersey (Away, L)", "JS-002", "Jerseys", 7000, 14000, 5, 5],
  ["Zannah Cap (White, Embroidered)", "ZC-001", "Caps", 2500, 5500, 42, 15],
  ["Zannah Cap (Navy, Plain)", "ZC-002", "Caps", 1800, 4000, 3, 10],
  ["P Cap (Black, Nike)", "PC-001", "Caps", 3200, 6500, 18, 8],
  ["Silver Cufflinks (Oval)", "CF-001", "Cufflinks", 4500, 9500, 7, 3],
  ["Gold Cufflinks (Square)", "CF-002", "Cufflinks", 6000, 13000, 4, 2],
  ["Cotton Singlet (White, L)", "UN-001", "Underwear", 1200, 2500, 48, 20],
  ["Boxer Briefs (Assorted, M)", "UN-002", "Underwear", 2000, 4000, 30, 15],
  ["Oud Perfume 50ml", "PF-001", "Perfumes", 9000, 18000, 11, 4],
  ["Attar Roll-on 12ml", "PF-002", "Perfumes", 2500, 5500, 22, 10],
];

// Pure offline demo mode (no EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID configured
// yet) still seeds a working local catalog, same as before, so the app is
// usable and demoable before Google Drive sync is set up.
const seedDemoData = () => {
  const t = now(),
    b = uuid();
  run("INSERT INTO business VALUES(?,?,?,?,?,?)", [
    b,
    "MD Collections",
    "NGN",
    "local-owner",
    t,
    t,
  ]);
  cats.forEach((n) =>
    run("INSERT INTO categories VALUES(?,?,?,?)", [uuid(), b, n, t]),
  );
  const cm: any = {};
  q<any>("SELECT id,name FROM categories").forEach((x) => (cm[x.name] = x.id));
  products.forEach((p) =>
    run(
      "INSERT INTO products(id,business_id,name,sku,barcode,category_id,supplier_id,cost_price,selling_price,current_stock,minimum_stock,unit,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        uuid(),
        b,
        p[0],
        p[1],
        null,
        cm[p[2] as string],
        null,
        p[3],
        p[4],
        p[5],
        p[6],
        "pcs",
        1,
        t,
        t,
      ],
    ),
  );
  [
    ["Kano Caps & Fabrics"],
    ["Balogun Market Textiles"],
    ["Aba Shoe Depot"],
    ["Istanbul Perfumes Ltd"],
    ["Lagos Jersey Hub"],
  ].forEach((x) =>
    run("INSERT INTO suppliers VALUES(?,?,?,?,?,?,?)", [
      uuid(),
      b,
      x[0],
      "",
      "",
      "",
      t,
      t,
    ]),
  );
  [
    "Emeka Okafor",
    "Fatima Bello",
    "Chinedu Nwosu",
    "Aisha Mohammed",
    "Tunde Adeyemi",
    "Grace Eze",
  ].forEach((n) =>
    run("INSERT INTO customers VALUES(?,?,?,?,?,?,?)", [
      uuid(),
      b,
      n,
      "",
      "",
      t,
      t,
    ]),
  );
  run("INSERT INTO members VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
    uuid(),
    b,
    "local-owner",
    "OWNER",
    "Demo Owner",
    "",
    "",
    1,
    "{}",
    t,
    t,
  ]);
};

const DEMO_USER = {
  id: "local-owner",
  name: "Demo Owner",
  role: "OWNER",
  email: "",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tick, setTick] = useState(0);

  // Resolves whichever identity is currently signed in, attempts a cloud
  // restore if a business folder is cached but the local business row is
  // missing (partial-restore recovery), and updates both the session
  // module (the default user/device for every repositories/core.ts write)
  // and the user shown in the UI. Called once at boot, and again by the
  // login/setup screens right after sign-in or business setup succeeds.
  const resolveUserAndBusiness = async () => {
    let resolvedUserId = "local-owner";
    if (hasGoogleAuth) {
      const googleUser = await signInSilentlyWithGoogle();
      setSignedIn(!!googleUser);
      if (googleUser) resolvedUserId = googleUser.id;
    } else {
      setSignedIn(true); // offline demo mode has no real auth gate
    }
    setCurrentSession({ userId: resolvedUserId });

    if (
      hasGoogleAuth &&
      resolvedUserId !== "local-owner" &&
      getCachedBusinessFolderId() &&
      !q("SELECT id FROM business LIMIT 1").length
    ) {
      const result = await restoreFromCloud().catch(() => ({
        ok: false,
        message: "",
      }));
      if (!result.ok)
        console.warn("[ShopStock] restore skipped:", result.message);
    }

    const localBusiness = q<any>("SELECT id FROM business LIMIT 1")[0];
    const member = localBusiness
      ? q<any>("SELECT * FROM members WHERE user_id=? OR id=?", [
          resolvedUserId,
          resolvedUserId,
        ])[0]
      : undefined;
    setUser(
      member
        ? {
            id: resolvedUserId,
            name: member.full_name,
            role: member.role,
            email: member.email,
          }
        : hasGoogleAuth && resolvedUserId !== "local-owner"
          ? { id: resolvedUserId, name: "", role: "EMPLOYEE", email: "" }
          : DEMO_USER,
    );
    setReady(true);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await getDeviceId();
      setCurrentSession({ deviceId: d });

      tx(() => {
        // sync_state must exist regardless of whether demo data gets
        // seeded below, or sync progress can never persist once Google
        // Drive sync is configured.
        run("INSERT OR IGNORE INTO sync_state(id,device_id) VALUES(1,?)", [d]);

        if (!q("SELECT id FROM business LIMIT 1").length && !hasGoogleAuth) {
          seedDemoData();
        }
      });

      if (alive) await resolveUserAndBusiness();
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => useAutoSync(true), []);
  return (
    <C.Provider
      value={{
        ready,
        signedIn,
        user,
        setUser,
        hasGoogleAuth,
        refreshUser: resolveUserAndBusiness,
        business: q<any>("SELECT * FROM business LIMIT 1")[0],
      }}
    >
      {children}
    </C.Provider>
  );
}
