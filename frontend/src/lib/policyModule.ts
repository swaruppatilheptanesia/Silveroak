import {
  BookOpen,
  Briefcase,
  FileText,
  ScrollText,
  Shield,
  type LucideIcon,
  Users,
} from 'lucide-react';
import type { ApiPolicyDetail, ApiPolicyListItem, CreatePolicyInput } from '@/types/policy';

export const POLICY_CATEGORIES = [
  { value: 'placement_policy', label: 'Placement Policy', icon: Briefcase, colorClassName: 'bg-primary/10 text-primary' },
  { value: 'mou_template', label: 'MoU Template', icon: ScrollText, colorClassName: 'bg-blue-500/10 text-blue-600' },
  { value: 'code_of_conduct', label: 'Code of Conduct', icon: Shield, colorClassName: 'bg-amber-500/10 text-amber-600' },
  { value: 'internship_guidelines', label: 'Internship Guidelines', icon: BookOpen, colorClassName: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'compliance', label: 'Compliance', icon: FileText, colorClassName: 'bg-sky-500/10 text-sky-600' },
  { value: 'institutional', label: 'Institutional', icon: Users, colorClassName: 'bg-cyan-500/10 text-cyan-600' },
] as const;

const defaultCategoryMeta = {
  label: 'Policy',
  icon: FileText as LucideIcon,
  colorClassName: 'bg-muted text-muted-foreground',
};

export function formatPolicyCategoryLabel(value: string) {
  const normalized = value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');

  if (!normalized) {
    return defaultCategoryMeta.label;
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPolicyCategoryMeta(category: string) {
  return POLICY_CATEGORIES.find((item) => item.value === category) ?? {
    ...defaultCategoryMeta,
    label: formatPolicyCategoryLabel(category),
  };
}

export function getPolicyErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function getPolicyFormDefaults(policy?: ApiPolicyDetail | null): CreatePolicyInput {
  return {
    title: policy?.title ?? '',
    category: policy?.category ?? 'placement_policy',
    description: policy?.description ?? '',
    content: policy?.content ?? '',
    version: policy?.version ?? '1.0',
    effective_date: policy?.effective_date?.slice(0, 10) ?? null,
    target_institutes: policy?.target_institutes?.slice(0, 1) ?? [],
    target_branches: policy?.target_branches?.slice(0, 1) ?? [],
    target_courses: policy?.target_courses?.slice(0, 1) ?? [],
    document_url: policy?.document_url ?? null,
    document_name: policy?.document_name ?? null,
    document_mime_type: policy?.document_mime_type ?? null,
    document_size: policy?.document_size ?? null,
  };
}

export function hasPolicyRichTextContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const allowedRichTextTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'div',
  'br',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote',
]);

export function sanitizePolicyRichTextHtml(content: string) {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(content);
  }

  const document = new DOMParser().parseFromString(content, 'text/html');

  function sanitizeNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map(sanitizeNode).join('');

    if (!allowedRichTextTags.has(tagName)) {
      return children;
    }

    if (tagName === 'br') {
      return '<br>';
    }

    return `<${tagName}>${children}</${tagName}>`;
  }

  return Array.from(document.body.childNodes).map(sanitizeNode).join('');
}

export function filterPoliciesBySearch(policies: ApiPolicyListItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return policies;

  return policies.filter((policy) => (
    policy.title.toLowerCase().includes(normalized)
    || (policy.description ?? '').toLowerCase().includes(normalized)
    || policy.version.toLowerCase().includes(normalized)
    || policy.category.toLowerCase().includes(normalized)
  ));
}
