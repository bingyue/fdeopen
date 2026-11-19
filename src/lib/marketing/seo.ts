import type { Metadata } from 'next';
import { siteUrl } from '@/lib/config';
import { book, founder, membership, purchaseReady } from './config';
export function marketingMetadata(kind: 'book' | 'membership'): Metadata {
  const title =
    kind === 'book'
      ? 'FDE前线部署工程师｜邴越著｜清华大学出版社'
      : 'FDE前线企业AI实战社群｜FDE中国社区';
  const description =
    kind === 'book'
      ? '了解《FDE前线部署工程师：企业AI转型与智能体工程化交付》的图书介绍、章节目录、作者、正版购买渠道及Awesome-FDE配套开源资源。'
      : '了解FDE前线企业AI实战社群：企业AI案例、FDE工程交付方法、Agent技术实践、专业交流及产业机会。';
  const images = [
    { url: kind === 'book' ? book.coverImage : '/marketing/community-share.png', alt: title },
  ];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' + kind },
    openGraph: { title, description, url: '/' + kind, type: 'website', locale: 'zh_CN', images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((x) => x.url) },
  };
}
export function bookStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': siteUrl() + '/book#book',
    name: book.title + '：' + book.subtitle,
    isbn: book.isbn,
    inLanguage: 'zh-CN',
    bookFormat: 'https://schema.org/Paperback',
    datePublished: book.publishedAt,
    image: siteUrl() + book.coverImage,
    url: siteUrl() + '/book',
    description: book.introduction,
    publisher: { '@type': 'Organization', name: book.publisher },
    author: {
      '@type': 'Person',
      '@id': siteUrl() + '/about#founder',
      name: founder.name,
      image: siteUrl() + founder.portrait,
      description: founder.biography,
    },
    sameAs: book.officialUrl,
  };
}
export function membershipStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: membership.name,
    description: membership.description,
    image: siteUrl() + '/marketing/community-share.png',
    url: siteUrl() + '/membership',
    brand: { '@type': 'Brand', name: 'FDE中国社区' },
    ...(purchaseReady()
      ? {
          offers: {
            '@type': 'Offer',
            price: membership.price,
            priceCurrency: membership.currency,
            url: membership.purchaseUrl,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}
