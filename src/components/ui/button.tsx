"use client";

import React from "react";
import { cn } from "~/lib/utils";
import { motion, type MotionProps } from "framer-motion";

type MotionButtonProps = MotionProps & {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
};

type HTMLButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "ref"
>;

const Button = React.forwardRef<
  HTMLButtonElement,
  MotionButtonProps & HTMLButtonProps
>(({ asChild = false, children, className, ...props }, ref) => {
  const classNames = cn(
    "flex h-12 px-6 items-center justify-center rounded-lg",
    className
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<
      Record<string, unknown> & { className?: string }
    >;
    return (
      <motion.span whileTap={{ scale: 0.93 }}>
        {React.cloneElement(child, {
          className: cn(
            child.props.className as string | undefined,
            classNames
          ),
          ref,
          ...props,
        })}
      </motion.span>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      className={classNames}
      ref={ref}
      {...props}
    >
      {children}
    </motion.button>
  );
});

Button.displayName = "Button";

export { Button };
