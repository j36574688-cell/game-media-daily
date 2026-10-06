// Claim 語句風險提示：只做「字詞層級」的提示，不是事實判決。
// 沒偵測到風險 ≠ 可以發布；預設結果是「待查證」（Fail Closed）。

export type Decision = "PUBLISH_WITH_CAVEAT" | "EDIT_REQUIRED" | "FAST_UNVERIFIED" | "NEEDS_EVIDENCE";

export const DECISION_LABEL: Record<Decision, string> = {
  PUBLISH_WITH_CAVEAT: "附但書發布",
  EDIT_REQUIRED: "需改寫",
  FAST_UNVERIFIED: "未證實語氣",
  NEEDS_EVIDENCE: "待查證",
};

/** 各內容類型建議的最低證據等級。 */
export const CONTENT_GATES: Record<string, string> = {
  快訊: "E1", 爆料: "E1", 一般新聞: "E3", 官方公告: "E5", 版本更新: "E4", 補丁: "E4", 熱修正: "E4", 發售: "E4", 延期: "E4",
  數據報導: "E3", 評測: "E3", 攻略: "E3", 爭議: "E4", "收購 / 投資": "E4", "裁員 / 勞動": "E4",
};

const ABSOLUTE = /玩家都|所有玩家|全部玩家|大家都|每個人都|普遍|沒人|沒有人|公認|完全沒有|\b(all players|everyone|every player|nobody|no one|everybody|universally)\b/i;
const CAUSAL = /導致|造成|引發|因而|使得|帶來後果|因為|所以|\b(caused|causes|because of|led to|leads to|resulted in|due to|thanks to)\b/i;
const RUMOR = /可能|疑似|據稱|據傳|傳聞|爆料|消息人士|\b(leak|leaked|rumou?r|reportedly|allegedly|insider|unconfirmed|sources say)\b/i;

export function detectSignals(text: string) {
  return { absolute: ABSOLUTE.test(text), causal: CAUSAL.test(text), rumor: RUMOR.test(text) };
}

export function assessClaim(text: string, contentType: string) {
  const s = detectSignals(text);
  const gate = CONTENT_GATES[contentType] || "E3";
  let decision: Decision = "NEEDS_EVIDENCE";
  let language = "依證據判定";
  const reasons: string[] = [];
  if (s.absolute) {
    decision = "EDIT_REQUIRED";
    language = "L3 觀察";
    reasons.push("Scope：群體範圍過大，建議改成可觀察、可量化的描述");
  }
  if (s.causal) {
    if (decision !== "EDIT_REQUIRED") decision = "PUBLISH_WITH_CAVEAT";
    language = "L3 觀察";
    reasons.push("Causality：只有同期變化不能證明因果，需要資料或官方說法");
  }
  if (s.rumor || contentType === "爆料" || contentType === "快訊") {
    decision = "FAST_UNVERIFIED";
    language = "L2 未證實";
    reasons.push("未證實：發布時保留「疑似／據稱／未獲官方確認」語氣");
  }
  if (!reasons.length) {
    reasons.push("未偵測到語句風險字詞");
    reasons.push(`能否發布取決於來源證據是否達到 ${gate}`);
  }
  const type = s.causal ? "CAUSALITY" : s.absolute ? "GLOBAL QUANTIFIER" : s.rumor ? "RUMOR" : "FACT";
  return { decision, reasons, language, type, gate };
}
