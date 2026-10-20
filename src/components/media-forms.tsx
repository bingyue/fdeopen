'use client';
import Link from 'next/link';
import { useState } from 'react';
import { mediaApi } from './media-interactions';
export function InquiryForm({
  kind,
  postId,
  diagnosis = false,
}: {
  kind: 'enterprise' | 'expert' | 'cooperation' | 'report' | 'event';
  postId?: string;
  diagnosis?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [done, setDone] = useState(false);
  return (
    <form
      className="media-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage('');
        const form = event.currentTarget,
          f = new FormData(form);
        const data = {
          ...Object.fromEntries(f),
          kind,
          post_id: postId || null,
          consent: f.get('consent') === 'on',
        };
        try {
          const r = await mediaApi('inquiry', data);
          setDone(true);
          setMessage(
            `申请已保存，编号 ${r.id.slice(0, 8)}。授权工作人员将通过你提供的联系方式跟进。`,
          );
          form.reset();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : '提交失败，请稍后再试');
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-two">
        <label>
          姓名 / 联系人
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
        </label>
        <label>
          联系方式（邮箱或电话）
          <input name="contact" required minLength={5} maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label>
        企业 / 机构名称{['enterprise', 'cooperation'].includes(kind) ? ' *' : '（选填）'}
        <input
          name="organization"
          required={['enterprise', 'cooperation'].includes(kind)}
          maxLength={200}
          autoComplete="organization"
        />
      </label>
      {kind === 'enterprise' && (
        <>
          <div className="form-two">
            <label>
              所属行业
              <input
                name="industry"
                required
                maxLength={200}
                placeholder="例如：制造、零售、金融"
              />
            </label>
            <label>
              业务场景
              <input
                name="scenario"
                required
                maxLength={200}
                defaultValue={diagnosis ? '企业 AI 诊断' : ''}
              />
            </label>
          </div>
          <label>
            当前主要问题
            <textarea
              name="problem"
              required
              minLength={10}
              maxLength={6000}
              placeholder="描述当前流程、困难及希望达成的业务结果，请勿提交商业机密。"
            />
          </label>
          <div className="form-two">
            <label>
              预算范围
              <select name="budget" required defaultValue="">
                <option value="" disabled>
                  请选择
                </option>
                {['待评估', '10万元以下', '10–50万元', '50–100万元', '100万元以上'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              期望实施周期
              <select name="timeline" required defaultValue="">
                <option value="" disabled>
                  请选择
                </option>
                {['一个月内', '一至三个月', '三至六个月', '六个月以上', '尚未确定'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {kind === 'expert' && (
        <>
          <label>
            专业领域
            <input name="expertise" required maxLength={200} />
          </label>
          <label>
            行业经验
            <textarea name="experience" required maxLength={6000} />
          </label>
          <label>
            代表案例
            <textarea
              name="representative_cases"
              required
              maxLength={6000}
              placeholder="仅填写已获授权公开的项目背景和你的职责，不提供客户秘密。"
            />
          </label>
        </>
      )}
      {kind === 'cooperation' && (
        <label>
          合作类型
          <select name="cooperation_type" required>
            <option>内容投稿</option>
            <option>采访线索</option>
            <option>产业研究合作</option>
            <option>品牌合作</option>
            <option>活动合作</option>
            <option>数据与隐私请求</option>
            <option>其他合作</option>
          </select>
        </label>
      )}
      <label>
        {kind === 'cooperation' ? '合作需求 / 投稿简介 *' : '补充说明（选填）'}
        <textarea
          name="notes"
          required={kind === 'cooperation'}
          minLength={kind === 'cooperation' ? 10 : undefined}
          maxLength={6000}
        />
      </label>
      <label className="consent-line">
        <input type="checkbox" name="consent" required />
        我已阅读
        <Link href="/privacy" target="_blank">
          隐私告知
        </Link>
        ，同意为处理本次申请保存上述信息并联系我；信息不公开展示，不用于未经授权的营销。
      </label>
      <button className="media-primary" disabled={pending}>
        {pending ? '正在保存…' : done ? '再次提交申请' : '提交申请'}
      </button>
      {message && (
        <div className="form-feedback" role="status">
          {message}
          {done && (
            <p>
              <Link href="/dashboard/requests">登录用户可在个人中心查看申请进度 →</Link>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
export function UnsubscribeForm({ token }: { token: string }) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="media-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await mediaApi('unsubscribe', { token });
          setMessage('此退订请求已处理。');
        } catch {
          setMessage('链接无效或服务暂不可用，请通过投稿合作入口联系编辑。');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>确认后，停止此链接对应邮箱的周刊订阅。</p>
      <button className="media-primary" disabled={busy || !token}>
        {busy ? '处理中…' : '确认退订'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
