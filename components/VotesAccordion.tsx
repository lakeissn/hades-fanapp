diff --git a/components/VotesAccordion.tsx b/components/VotesAccordion.tsx
new file mode 100644
index 0000000000000000000000000000000000000000..9baf2a3dbdbc83df0b345b1d61241215d0047664
--- /dev/null
+++ b/components/VotesAccordion.tsx
@@ -0,0 +1,36 @@
+"use client";
+
+import { useState } from "react";
+import VoteAccordionItem from "./VoteAccordionItem";
+
+export type VoteItem = {
+  id: string;
+  title: string;
+  platform: string;
+  platformLabel: string;
+  url: string | null;
+  opensAt?: string;
+  closesAt?: string;
+  note?: string;
+};
+
+type VotesAccordionProps = {
+  votes: VoteItem[];
+};
+
+export default function VotesAccordion({ votes }: VotesAccordionProps) {
+  const [openId, setOpenId] = useState<string | null>(null);
+
+  return (
+    <div className="votes-accordion">
+      {votes.map((vote) => (
+        <VoteAccordionItem
+          key={vote.id}
+          vote={vote}
+          isOpen={openId === vote.id}
+          onToggle={() => setOpenId(openId === vote.id ? null : vote.id)}
+        />
+      ))}
+    </div>
+  );
+}
