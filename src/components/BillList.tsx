import { formatDisplayDate } from "../dates";
import { formatYuan } from "../money";
import { CATEGORY_LABELS, type Transaction } from "../types";
import EmptyState from "./EmptyState";
import {
  CategoryIcon,
  IconCalendar,
  IconEdit,
  IconInbox,
  IconIn,
  IconNote,
  IconOut,
  IconSearch,
  IconTrash,
} from "./Icons";

interface Props {
  bills: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function BillList({ bills, onDelete, onEdit }: Props) {
  if (bills.length === 0) {
    return (
      <EmptyState icon={<IconInbox size={28} />}>
        <IconSearch size={14} /> 没有符合条件的账单。换个筛选，或记一笔试试。
      </EmptyState>
    );
  }

  return (
    <div>
      {bills.map((bill) => (
        <div className="bill" key={bill.id}>
          <div
            className={`bill-icon ${bill.type === "expense" ? "is-out" : "is-in"}`}
            aria-hidden="true"
          >
            <CategoryIcon id={bill.category} size={18} />
          </div>
          <div className="bill-main">
            <div className="bill-title">
              <span className="bill-type">
                {bill.type === "expense" ? <IconOut size={13} /> : <IconIn size={13} />}
                {bill.type === "expense" ? "支出" : "收入"}
              </span>
              <span className="bill-sep">·</span>
              <CategoryIcon id={bill.category} size={13} />
              {CATEGORY_LABELS[bill.category]}
            </div>
            <div className="bill-meta">
              <IconCalendar size={12} />
              {formatDisplayDate(bill.date)}
              {bill.note ? (
                <>
                  <span className="bill-sep">·</span>
                  <IconNote size={12} />
                  {bill.note}
                </>
              ) : null}
            </div>
            <div className="bill-actions">
              <button type="button" className="btn ghost" onClick={() => onEdit(bill.id)}>
                <IconEdit size={14} />
                改账
              </button>
              <button type="button" className="btn ghost" onClick={() => onDelete(bill.id)}>
                <IconTrash size={14} />
                删除
              </button>
            </div>
          </div>
          <div className={`bill-amount ${bill.type === "expense" ? "gap" : "ok"}`}>
            {bill.type === "expense" ? "-" : "+"}
            {formatYuan(bill.amountFen)}
          </div>
        </div>
      ))}
    </div>
  );
}
