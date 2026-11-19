'use client';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import type { MarketingContext } from '@/lib/marketing/events';
import { PromoView, track, TrackedLink } from './tracking';

export type PurchaseOptions = {
  ready: boolean;
  purchaseUrl: string;
  qr: string;
  memberAccessUrl: string;
};
export function PurchaseQRCode({ src, context }: { src: string; context: MarketingContext }) {
  if (!src) return null;
  return (
    <PromoView event="purchase_qrcode_view" context={context} className="purchase-qr">
      <Image
        src={src}
        alt="知识星球官方付费邀请二维码，使用微信扫码查看实际购买规则"
        width={192}
        height={192}
        unoptimized
      />
      <p>微信扫码，在知识星球确认权益与付款</p>
      <a href={src} download="FDEChina-Pro-QR.png">
        保存二维码
      </a>
    </PromoView>
  );
}
export function PurchaseActions({
  options,
  context,
  compact = false,
}: {
  options: PurchaseOptions;
  context: MarketingContext;
  compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useId();
  const [message, setMessage] = useState('');
  if (!options.ready)
    return (
      <div className="purchase-preview">
        <button className="marketing-button" disabled>
          暂未开放购买
        </button>
        {!compact && <p>方案预览（mock）· 正式价格、购买二维码和服务规则确认后开放。</p>}
      </div>
    );
  return (
    <div className="purchase-actions">
      <a
        className="marketing-button"
        href={options.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          track('membership_purchase_click', context);
          if (options.qr && matchMedia('(min-width: 768px)').matches) {
            e.preventDefault();
            dialog.current?.showModal();
            track('purchase_qrcode_view', context);
          }
        }}
      >
        立即付费加入 ↗
      </a>
      {!compact && (
        <>
          <button
            className="marketing-text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(options.purchaseUrl);
                track('purchase_link_copy', context);
                setMessage('购买链接已复制，请在微信或浏览器中打开。');
              } catch {
                setMessage('复制未成功，请长按下方链接复制。');
              }
            }}
          >
            复制购买链接
          </button>
          <a
            className="purchase-raw-link"
            href={options.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('membership_purchase_click', context)}
          >
            打开知识星球购买链接 ↗
          </a>
          <p>微信内可直接打开；如遇拦截，请复制链接至浏览器。订单与会员资格以知识星球记录为准。</p>
          <p role="status">{message}</p>
          <TrackedLink event="member_access_click" context={context} href={options.memberAccessUrl}>
            已有会员，进入知识星球 ↗
          </TrackedLink>
        </>
      )}
      {options.qr && (
        <dialog
          ref={dialog}
          className="purchase-modal"
          aria-labelledby={dialogTitle}
          onClick={(e) => {
            if (e.target === e.currentTarget) dialog.current?.close();
          }}
        >
          <div className="purchase-modal-content">
            <button
              className="purchase-close"
              aria-label="关闭购买窗口"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
            <h2 id={dialogTitle}>加入企业AI实战社群</h2>
            <p>请先在支付平台确认价格、权益及退款规则。</p>
            <Image
              src={options.qr}
              alt="知识星球付费邀请二维码"
              width={240}
              height={240}
              unoptimized
            />
            <a href={options.qr} download="FDEChina-Pro-QR.png">
              保存二维码
            </a>
            <TrackedLink
              className="marketing-button"
              event="membership_purchase_click"
              context={context}
              href={options.purchaseUrl}
            >
              直接打开购买页 ↗
            </TrackedLink>
          </div>
        </dialog>
      )}
    </div>
  );
}
export function MobilePurchaseBar({ options }: { options: PurchaseOptions }) {
  return (
    <div className="mobile-purchase-bar">
      <div>
        <strong>FDE China Pro</strong>
        <small>{options.ready ? '年度实战会员' : '方案预览 · 尚未开售'}</small>
      </div>
      <PurchaseActions
        options={options}
        context={{ placement: 'mobile-bar', contentType: 'membership' }}
        compact
      />
    </div>
  );
}
