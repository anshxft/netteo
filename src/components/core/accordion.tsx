'use client';

import React, { createContext, useContext, useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/components/icons/Icon';
import styles from './Accordion.module.css';

// --- Accordion Root Context ---
interface AccordionContextType {
  isExpanded: (value: string) => boolean;
  toggle: (value: string) => void;
  variant: 'cards' | 'divided';
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error('Accordion subcomponents must be used within an <Accordion>');
  }
  return ctx;
}

// --- Accordion Item Context ---
interface AccordionItemContextType {
  value: string;
  triggerId: string;
  contentId: string;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(null);

function useAccordionItem() {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error('AccordionTrigger and AccordionContent must be used within an <AccordionItem>');
  }
  return ctx;
}

// --- Component: Accordion Root ---
export interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (val: string | string[]) => void;
  variant?: 'cards' | 'divided';
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  type = 'single',
  defaultValue,
  value: controlledValue,
  onValueChange,
  variant = 'cards',
  className = '',
  children,
}: AccordionProps) {
  const [internalState, setInternalState] = useState<string[]>(() => {
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const activeValues = controlledValue !== undefined
    ? (Array.isArray(controlledValue) ? controlledValue : [controlledValue])
    : internalState;

  const isExpanded = (val: string) => activeValues.includes(val);

  const toggle = (val: string) => {
    let next: string[];
    if (type === 'multiple') {
      next = activeValues.includes(val)
        ? activeValues.filter((v) => v !== val)
        : [...activeValues, val];
    } else {
      next = activeValues.includes(val) ? [] : [val];
    }

    if (controlledValue === undefined) {
      setInternalState(next);
    }
    if (onValueChange) {
      onValueChange(type === 'multiple' ? next : (next[0] ?? ''));
    }
  };

  return (
    <AccordionContext.Provider value={{ isExpanded, toggle, variant }}>
      <div className={`${styles.accordionRoot} ${className}`} role="region">
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// --- Component: AccordionItem ---
export interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function AccordionItem({ value, className = '', children }: AccordionItemProps) {
  const { isExpanded, variant } = useAccordion();
  const id = useId();
  const triggerId = `accordion-trigger-${id}`;
  const contentId = `accordion-content-${id}`;
  const open = isExpanded(value);

  const itemClass = variant === 'cards' ? styles.accordionCardItem : styles.accordionItem;

  return (
    <AccordionItemContext.Provider value={{ value, triggerId, contentId }}>
      <div
        className={`${itemClass} ${className}`}
        data-state={open ? 'open' : 'closed'}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

// --- Component: AccordionTrigger ---
export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  hideIcon?: boolean;
}

export function AccordionTrigger({
  children,
  icon,
  hideIcon = false,
  className = '',
  onClick,
  ...props
}: AccordionTriggerProps) {
  const { isExpanded, toggle } = useAccordion();
  const { value, triggerId, contentId } = useAccordionItem();
  const open = isExpanded(value);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggle(value);
    if (onClick) onClick(e);
  };

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={open}
      aria-controls={contentId}
      className={`${styles.accordionTrigger} ${className}`}
      onClick={handleClick}
      {...props}
    >
      <span>{children}</span>
      {!hideIcon && (
        <span className={styles.chevron}>
          {icon || <Icon icon={ChevronDown} size="sm" />}
        </span>
      )}
    </button>
  );
}

// --- Component: AccordionContent ---
export interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AccordionContent({ children, className = '' }: AccordionContentProps) {
  const { isExpanded } = useAccordion();
  const { value, triggerId, contentId } = useAccordionItem();
  const open = isExpanded(value);

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      data-state={open ? 'open' : 'closed'}
      className={`${styles.accordionContent} ${className}`}
    >
      <div className={styles.contentInner}>
        <div className={styles.contentBody}>{children}</div>
      </div>
    </div>
  );
}

// --- Exported Example Pattern: AccordionBasic ---
export function AccordionBasic() {
  return (
    <Accordion defaultValue="getting-started" variant="divided">
      <AccordionItem value="getting-started">
        <AccordionTrigger>Getting Started</AccordionTrigger>
        <AccordionContent>
          <p>
            Discover the fundamental concepts of Motion-Primitives. This section
            guides you through the installation process and provides an overview
            of how to integrate these components into your projects. Learn about
            the core functionalities and how to set up your first animation
            effectively.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="animation-properties">
        <AccordionTrigger>Animation Properties</AccordionTrigger>
        <AccordionContent>
          <p>
            Explore the comprehensive range of animation properties available in
            Motion-Primitives. Understand how to manipulate timing, easing, and
            delays to create smooth, dynamic animations. This segment also
            covers the customization of animations to fit the flow and style of
            your web applications.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="advanced-usage">
        <AccordionTrigger>Advanced Usage</AccordionTrigger>
        <AccordionContent>
          <p>
            Dive deeper into advanced techniques and features of
            Motion-Primitives. Learn about chaining animations, creating complex
            sequences, and utilizing motion sensors for interactive animations.
            Gain insights on how to leverage these advanced features to enhance
            user experience and engagement.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="community-and-support">
        <AccordionTrigger>Community and Support</AccordionTrigger>
        <AccordionContent>
          <p>
            Engage with the Motion-Primitives community to gain additional
            support and insight. Find out how to participate in discussions,
            contribute to the project, and access a wealth of shared knowledge
            and resources. Learn about upcoming features, best practices, and
            how to get help with your specific use cases.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
