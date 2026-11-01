import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWRInfinite from "swr/infinite";
import {
  ArrowRight,
  Car,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, telegram } from "./telegram";
import { normalizePrice, type Section } from "../../shared/catalog";
import {
  ruleName,
  type VehicleModel,
  type VehicleRule,
} from "../../shared/vehicles";
type Page<T> = { items: T[]; more: boolean };
export function VehicleManager({
  section,
  onClose,
}: {
  section?: Section;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const guard = useRef(false);
  const [view, setView] = useState<
    "list" | "rule" | "picker" | "model" | "delete"
  >("list");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [make, setMake] = useState("");
  const [modelName, setModelName] = useState("");
  const [active, setActive] = useState(true);
  const [modelId, setModelId] = useState("");
  const [editingRule, setEditingRule] = useState<VehicleRule | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [chosen, setChosen] = useState<VehicleModel | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [engine, setEngine] = useState("");
  const [trim, setTrim] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    telegram?.enableClosingConfirmation?.();
    return () => telegram?.disableClosingConfirmation?.();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);
  const models = useSWRInfinite(
    (index, prev) =>
      prev && !prev.more
        ? null
        : `vehicles?q=${encodeURIComponent(query)}&offset=${index * 40}`,
    (path) => api<Page<VehicleModel>>(path),
    { dedupingInterval: 15000, errorRetryCount: 1 },
  );
  const rules = useSWRInfinite(
    (index, prev) =>
      !section || (prev && !prev.more)
        ? null
        : `vehicles?section=${section.id}&offset=${index * 40}`,
    (path) => api<Page<VehicleRule>>(path),
    { dedupingInterval: 15000, errorRetryCount: 1 },
  );
  const modelRows = models.data?.flatMap((p) => p.items) || [];
  const ruleRows = rules.data?.flatMap((p) => p.items) || [];
  function editModel(m?: VehicleModel) {
    setEditingModel(m || null);
    setModelId(m?.id || crypto.randomUUID());
    setMake(m?.make || "");
    setModelName(m?.model || "");
    setActive(m?.active ?? true);
    setError("");
    setView("model");
  }
  function editRule(r?: VehicleRule) {
    setEditingRule(r || null);
    setRuleId(r?.id || crypto.randomUUID());
    setChosen(r?.model || null);
    setFrom(r ? String(r.year_from) : "");
    setTo(r ? String(r.year_to) : "");
    setEngine(r?.engine || "");
    setTrim(r?.trim || "");
    setError("");
    setView("rule");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      if (view === "model") {
        const { item } = await api<{ item: VehicleModel }>("vehicles", {
          method: editingModel ? "PATCH" : "POST",
          body: JSON.stringify({
            kind: "model",
            id: modelId,
            make,
            model: modelName,
            active,
            ...(editingModel ? { version: editingModel.version } : {}),
          }),
        });
        await models.mutate();
        if (section) {
          setChosen(item);
          setView("rule");
        } else setView("list");
      } else if (view === "delete") {
        await api("vehicles", {
          method: "DELETE",
          body: JSON.stringify({
            kind: "rule",
            id: editingRule!.id,
            version: editingRule!.version,
          }),
        });
        await rules.mutate();
        setView("list");
      } else if (view === "rule") {
        if (!chosen) throw new Error("سەرەتا مۆدێلێک هەڵبژێرە.");
        const start = Number(normalizePrice(from)),
          end = Number(normalizePrice(to));
        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 1900 ||
          end > 2100 ||
          end < start
        )
          throw new Error("مەودای ساڵ لە نێوان ١٩٠٠ و ٢١٠٠ بە دروستی بنووسە.");
        await api("vehicles", {
          method: editingRule ? "PATCH" : "POST",
          body: JSON.stringify({
            kind: "rule",
            id: ruleId,
            section_id: section!.id,
            model_id: chosen.id,
            year_from: start,
            year_to: end,
            engine,
            trim,
            ...(editingRule ? { version: editingRule.version } : {}),
          }),
        });
        await rules.mutate();
        setView("list");
      }
      telegram?.HapticFeedback?.notificationOccurred("success");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const title = section ? "ئۆتۆمبێلە پەیوەندیدارەکان" : "مارکە و مۆدێلەکان";
  const listError = view === "picker" || !section ? models.error : rules.error;
  return (
    <dialog
      ref={dialog}
      className="section-dialog vehicle-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      aria-labelledby="vehicle-title"
    >
      <form onSubmit={submit}>
        <div className="dialog-handle" />
        <div className="dialog-heading">
          <div>
            <span className="overline">Darewaza</span>
            <h2 id="vehicle-title">
              {view === "model"
                ? editingModel
                  ? "دەستکاری مۆدێل"
                  : "مۆدێلی نوێ"
                : view === "rule"
                  ? "بەستنەوەی ئۆتۆمبێل"
                  : view === "picker"
                    ? "هەڵبژاردنی مۆدێل"
                    : view === "delete"
                      ? "سڕینەوەی پەیوەندی"
                      : title}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="داخستن"
          >
            <X size={21} />
          </button>
        </div>
        {section && (
          <p className="field-hint" dir="auto">
            {section.name}
          </p>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {view !== "list" && (
          <button
            type="button"
            className="subtle-button vehicle-back"
            disabled={busy}
            onClick={() => {
              setError("");
              setView(
                view === "picker" || (view === "model" && section)
                  ? "rule"
                  : "list",
              );
            }}
          >
            <ArrowRight size={16} />
            گەڕانەوە
          </button>
        )}
        {view === "list" && section && (
          <>
            <p className="vehicle-explainer">
              {section.is_terminal
                ? "تەنها ئەم لیستە گونجانی ئەم پارچەیە دیاری دەکات. بزوێنەر و جۆری مۆدێل تەنها کاتێک بەتاڵ بهێڵەوە کە بۆ هەموویان دەگونجێت."
                : "ئەم پەیوەندییانە ڕێگای کورت بۆ ئەم بەشە دروست دەکەن. گونجانی پارچەکانی ژێرەوە پشتڕاست ناکەنەوە."}
            </p>
            <button
              type="button"
              className="primary-button vehicle-add"
              onClick={() => editRule()}
            >
              <Plus size={17} />
              بەستنەوەی ئۆتۆمبێل
            </button>
            {ruleRows.map((r) => (
              <div className="vehicle-row" key={r.id}>
                <Car size={21} />
                <div className="vehicle-copy">
                  <strong dir="auto">{ruleName(r)}</strong>
                  <small dir="auto">
                    {r.engine || "هەموو بزوێنەرەکان"} ·{" "}
                    {r.trim || "هەموو جۆرەکان"}
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="دەستکاری پەیوەندی"
                  onClick={() => editRule(r)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button danger-text"
                  aria-label="سڕینەوەی پەیوەندی"
                  onClick={() => {
                    setEditingRule(r);
                    setView("delete");
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!rules.isLoading && !ruleRows.length && (
              <p className="vehicle-empty">هێشتا ئۆتۆمبێلێک نەبەستراوەتەوە.</p>
            )}
            {rules.data?.at(-1)?.more && (
              <button
                type="button"
                className="load-more"
                disabled={rules.isValidating}
                onClick={() => void rules.setSize((n) => n + 1)}
              >
                بینینی زیاتر
              </button>
            )}
          </>
        )}
        {(view === "picker" || (view === "list" && !section)) && (
          <>
            <label className="search vehicle-search">
              <Search size={18} />
              <input
                aria-label="گەڕان بە مۆدێل"
                value={q}
                maxLength={100}
                onChange={(e) => setQ(e.target.value)}
                placeholder="گەڕان بە مارکە یان مۆدێل…"
              />
            </label>
            <button
              type="button"
              className="subtle-button vehicle-add"
              onClick={() => editModel()}
            >
              <Plus size={17} />
              مۆدێلی نوێ
            </button>
            {modelRows.map((m) => (
              <div className="vehicle-row" key={m.id}>
                <Car size={21} />
                <button
                  type="button"
                  disabled={!!section && !m.active}
                  className="vehicle-copy vehicle-choose"
                  onClick={() => {
                    if (section) {
                      setChosen(m);
                      setView("rule");
                    } else editModel(m);
                  }}
                >
                  <strong dir="auto">
                    {m.make} {m.model}
                  </strong>
                  <small>{m.active ? "چالاک" : "ناچالاک"}</small>
                </button>
                {section && chosen?.id === m.id && <Check size={18} />}
                <button
                  type="button"
                  className="icon-button"
                  aria-label="دەستکاری مۆدێل"
                  onClick={() => editModel(m)}
                >
                  <Pencil size={16} />
                </button>
              </div>
            ))}
            {!models.isLoading && !modelRows.length && (
              <p className="vehicle-empty">
                هیچ مۆدێلێک نەدۆزرایەوە. مۆدێلێکی نوێ زیاد بکە.
              </p>
            )}
            {models.data?.at(-1)?.more && (
              <button
                type="button"
                className="load-more"
                disabled={models.isValidating}
                onClick={() => void models.setSize((n) => n + 1)}
              >
                بینینی زیاتر
              </button>
            )}
          </>
        )}
        {view === "model" && (
          <fieldset className="dialog-fields" disabled={busy}>
            <label className="field">
              مارکە
              <input
                required
                maxLength={60}
                value={make}
                onChange={(e) => setMake(e.target.value)}
                dir="auto"
                placeholder="BYD"
              />
            </label>
            <label className="field">
              مۆدێل
              <input
                required
                maxLength={80}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                dir="auto"
                placeholder="Qin Plus"
              />
            </label>
            <label className="vehicle-active">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              چالاک بێت بۆ هەڵبژاردنی کڕیار
            </label>
            <p className="field-hint">
              ناچالاککردن ئۆتۆمبێلە پاشەکەوتکراوەکان و پەیوەندییە پێشووترەکان
              ناسڕێتەوە.
            </p>
          </fieldset>
        )}
        {view === "rule" && (
          <fieldset className="dialog-fields" disabled={busy}>
            <label className="field">
              مارکە و مۆدێل
              <button
                type="button"
                className="vehicle-model-select"
                onClick={() => {
                  setQ("");
                  setView("picker");
                }}
              >
                {chosen ? `${chosen.make} ${chosen.model}` : "هەڵبژاردنی مۆدێل"}
                <Car size={18} />
              </button>
            </label>
            <div className="price-fields">
              <label className="field">
                لە ساڵی
                <input
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="2020"
                />
              </label>
              <label className="field">
                تا ساڵی
                <input
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="2024"
                />
              </label>
            </div>
            <label className="field">
              بزوێنەر <small>بەتاڵ = هەموو بزوێنەرەکان</small>
              <input
                maxLength={80}
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                dir="auto"
                placeholder="1.5L Hybrid"
              />
            </label>
            <label className="field">
              جۆری مۆدێل <small>بەتاڵ = هەموو جۆرەکان</small>
              <input
                maxLength={80}
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                dir="auto"
                placeholder="Premium"
              />
            </label>
            <p className="field-hint">
              هەر پارچەیەک دەتوانێت بۆ چەندین ئۆتۆمبێل تۆمار بکرێت. زانیارییەکان
              بە وردی بنووسە.
            </p>
          </fieldset>
        )}
        {view === "delete" && (
          <p className="vehicle-explainer">
            ئەم پەیوەندییە بسڕدرێتەوە؟ بەش و ئۆتۆمبێلەکان دەمێننەوە.
          </p>
        )}
        {(view === "model" || view === "rule" || view === "delete") && (
          <div className="dialog-actions">
            <button
              type="button"
              className="subtle-button"
              onClick={() => setView("list")}
              disabled={busy}
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={busy || (view === "rule" && !chosen)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : view === "delete" ? (
                <Trash2 size={17} />
              ) : (
                <Check size={17} />
              )}{" "}
              {view === "delete" ? "سڕینەوە" : "پاشەکەوتکردن"}
            </button>
          </div>
        )}
        {listError && (
          <div className="error-box" role="alert">
            {listError.message}
            <button
              type="button"
              onClick={() =>
                void (section && view !== "picker"
                  ? rules.mutate()
                  : models.mutate())
              }
            >
              هەوڵدانەوە
            </button>
          </div>
        )}
        {(view === "list" && section
          ? rules.isLoading
          : (view === "list" || view === "picker") && models.isLoading) && (
          <div className="vehicle-empty">
            <LoaderCircle size={20} className="spin" />
          </div>
        )}
      </form>
    </dialog>
  );
}
