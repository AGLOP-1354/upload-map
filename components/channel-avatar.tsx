import type { Channel } from "@/lib/types";

// 원형 채널 로고. 로고가 없으면 이름 첫 글자를 구분 색으로.
export function ChannelAvatar({
  channel,
  size,
  label = false,
}: {
  channel: Pick<Channel, "id" | "name" | "color" | "logo" | "updatedAt">;
  size: number;
  label?: boolean;
}) {
  const style = { width: size, height: size, borderColor: channel.color };
  const border = size >= 40 ? "border-2" : "border-[1.5px]";
  if (channel.logo) {
    return (
      // 로그인 뒤에서만 열리는 작은 로고라 next/image 최적화 대신 그대로 쓴다.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/c/${channel.id}/logo?v=${encodeURIComponent(channel.updatedAt)}`}
        alt={label ? `${channel.name} 로고` : ""}
        style={style}
        className={`flex-none rounded-full object-cover ${border}`}
      />
    );
  }
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label ? `${channel.name} 로고` : undefined}
      aria-hidden={label ? undefined : true}
      style={{ ...style, color: channel.color, fontSize: Math.round(size * 0.42) }}
      className={`flex flex-none items-center justify-center rounded-full bg-ink font-serif font-extrabold ${border}`}
    >
      {channel.name.trim().charAt(0) || "?"}
    </span>
  );
}
