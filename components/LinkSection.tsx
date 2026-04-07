"use client";

import type { Link } from "@/types";
import SectionTabs from "@/components/SectionTabs";
import LinkCard from "@/components/LinkCard";

type LinkTab = "unread" | "read";

interface LinkSectionProps {
  links: Link[];
  activeTab: LinkTab;
  onTabChange: (tab: LinkTab) => void;
  onToggleRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export default function LinkSection({
  links,
  activeTab,
  onTabChange,
  onToggleRead,
  onDelete,
  onTagClick,
}: LinkSectionProps) {
  const unread = links.filter((l) => !l.read);
  const read = links.filter((l) => l.read);
  const visible = activeTab === "unread" ? unread : read;

  const tabs = [
    { key: "unread", label: `읽지 않음${unread.length > 0 ? ` ${unread.length}` : ""}` },
    { key: "read", label: `읽음${read.length > 0 ? ` ${read.length}` : ""}` },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <SectionTabs
        tabs={tabs}
        active={activeTab}
        onChange={(key) => onTabChange(key as LinkTab)}
      />

      {visible.length === 0 ? (
        <EmptyState
          isFirstUse={links.length === 0}
          isReadTab={activeTab === "read"}
        />
      ) : (
        <div className="mx-4 md:mx-0 mt-3 flex flex-col gap-3">
          {visible.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onToggleRead={onToggleRead}
              onDelete={onDelete}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  isFirstUse,
  isReadTab,
}: {
  isFirstUse: boolean;
  isReadTab: boolean;
}) {
  if (isFirstUse) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-[56px] opacity-30">🔗</span>
        <p className="text-[20px] text-[var(--label-tertiary)] text-center px-8">
          텔레그램에서 봇으로 링크를 보내면
          <br />
          여기에 모입니다.
        </p>
      </div>
    );
  }
  if (isReadTab) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-[56px] opacity-30">📚</span>
        <p className="text-[20px] text-[var(--label-tertiary)]">
          아직 읽은 링크가 없어요
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-[56px] opacity-30">📬</span>
      <p className="text-[20px] text-[var(--label-tertiary)] text-center">
        모두 읽었어요!
        <br />
        새 링크는 텔레그램 봇으로 보내주세요.
      </p>
    </div>
  );
}
