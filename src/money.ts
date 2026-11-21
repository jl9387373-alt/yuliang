const YUAN_PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

/** 手机输入法常见干扰：全角数字、中文句号、逗号、¥/元 */
export function normalizeYuanInput(input: string): string {
  let s = input.trim();
  s = s.replace(/[￥¥元]/g, "");
  s = s.replace(/[\uFF10-\uFF19]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
  s = s.replace(/[。．，,]/g, ".");
  s = s.replace(/\s+/g, "");
  // 去掉前导零：012 -> 12，但保留 0.5
  if (/^0\d+/.test(s)) s = s.replace(/^0+/, "") || "0";
  // 12. -> 12（手机小数键盘常残留点）
  if (/^\d+\.$/.test(s)) s = s.slice(0, -1);
  return s;
}

export function yuanTextToFen(input: string): number | null {
  const trimmed = normalizeYuanInput(input);
  if (!trimmed || !YUAN_PATTERN.test(trimmed)) return null;
  const [yuanPart, frac = ""] = trimmed.split(".");
  const fen = Number(yuanPart) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(fen) || fen <= 0) return null;
  return fen;
}

export function yuanTextToFenAllowZero(input: string): number | null {
  const trimmed = normalizeYuanInput(input);
  if (!trimmed) return 0;
  if (!YUAN_PATTERN.test(trimmed)) return null;
  const [yuanPart, frac = ""] = trimmed.split(".");
  const fen = Number(yuanPart) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(fen) || fen < 0) return null;
  return fen;
}

export function fenToYuanText(fen: number): string {
  const sign = fen < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(fen));
  const yuan = Math.floor(abs / 100);
  const leftover = abs % 100;
  return `${sign}${yuan}.${String(leftover).padStart(2, "0")}`;
}

export function formatYuan(fen: number): string {
  // 负号放在 ¥ 前面，和账单列表的「-¥3.00」保持一致
  const sign = fen < 0 ? "-" : "";
  return `${sign}¥${fenToYuanText(Math.abs(fen))}`;
}
