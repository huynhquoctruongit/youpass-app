import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from "react-native";
import { cva, VariantProps } from "class-variance-authority";

const button = cva(["flex-row items-center gap-1 duration-200 rounded-[28px]"], {
  variants: {
    variant: {
      "primary-default": "bg-primary-01 active:bg-primary-06",
      "primary-shadow": "bg-primary-02 active:bg-primary-03",
      "primary-outline": "border border-primary-01 bg-primary-02 active:bg-primary-03",

      "secondary-default": "bg-dark-75 active:bg-dark-50",
      "secondary-tambon": "bg-secondary-05 active:opacity-90",
      "secondary-shadow": "bg-white active:bg-white-01",
      "secondary-outline": "border border-neutral-06 active:border-dark-75 bg-white active:bg-white-01",

      "tertiary-default": "border border-secondary-01 bg-secondary-02 active:bg-secondary-03",
      "tertiary-outline": "bg-white active:bg-secondary-03",
      "teritary-solid": "bg-secondary-01 active:bg-secondary-green",

      "base-default": "bg-white active:bg-gray-200",
      "base-shadow": "",
      "base-outline": "bg-white border border-gray-200 active:bg-gray-200",

      "link-color": "underline",
      "link-gray": "underline",

      "disabled-default": "border border-dark-25 bg-dark-25",
      "disabled-shadow": "bg-light-0",
      "disabled-outline": "border border-dark-0 bg-light-0",
      "disabled-tertiary-link": "",
      "disabled-secondary-default": "border border-dark-25 bg-dark-25",
    },
    size: {
      "2xs": "px-[14px] py-1.5",
      xs: "px-[14px] py-1.5",
      sm: "px-[14px] py-1.5",
      md: "px-4 py-2.5",
      lg: "px-[18px] py-4",
      xl: "px-5 py-3",
      "2xl": "px-[28px] py-4",
    },
  },
  compoundVariants: [
    {
      variant: "primary-default",
      size: "sm",
      class: "",
    },
  ],
  defaultVariants: {
    variant: "primary-default",
    size: "sm",
  },
});

const buttonText = cva(["text-center"], {
  variants: {
    variant: {
      "primary-default": "text-white",
      "primary-shadow": "text-primary-01",
      "primary-outline": "text-primary-01",

      "secondary-default": "text-light-0",
      "secondary-tambon": "text-light-0",
      "secondary-shadow": "text-dark-75",
      "secondary-outline": "text-dark-75",

      "tertiary-default": "text-secondary-01",
      "tertiary-outline": "text-secondary-01",
      "teritary-solid": "text-white",

      "base-default": "text-dark-0",
      "base-shadow": "",
      "base-outline": "text-dark",

      "link-color": "text-teritary-06",
      "link-gray": "text-dark-50",

      "disabled-default": "text-light-0",
      "disabled-shadow": "text-dark-0",
      "disabled-outline": "text-dark-0",
      "disabled-tertiary-link": "text-dark-0",
      "disabled-secondary-default": "text-light-0",
    },
    size: {
      "2xs": "text-t5-bold",
      xs: "text-t4-bold",
      sm: "text-t3-bold",
      md: "text-t3-bold",
      lg: "text-t3-bold",
      xl: "text-t3-bold",
      "2xl": "text-t3-bold",
    },
  },
  defaultVariants: {
    variant: "primary-default",
    size: "sm",
  },
});

type variantProps =
  | "primary-default"
  | "primary-shadow"
  | "primary-outline"
  | "secondary-default"
  | "secondary-tambon"
  | "secondary-shadow"
  | "secondary-outline"
  | "tertiary-default"
  | "tertiary-outline"
  | "teritary-solid"
  | "link-color"
  | "link-gray"
  | "disabled-default"
  | "disabled-shadow"
  | "disabled-outline"
  | "disabled-tertiary-link"
  | any;

export interface ButtonProps extends Omit<TouchableOpacityProps, "children">, VariantProps<typeof button> {
  variant?: variantProps;
  icon?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  disabled,
  variant = "primary-default",
  size,
  icon,
  isLoading,
  children,
  ...props
}) => {
  const isDisabled = disabled || isLoading;
  const resolvedVariant = isDisabled ? "disabled-" + variant : variant;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.8}
      className={
        "items-center flex-row whitespace-nowrap gap-2 " +
        button({ variant: resolvedVariant, size, className })
      }
      {...props}
    >
      {isLoading && <ActivityIndicator size="small" className="w-4 h-4 shrink-0" />}
      {icon && <View className="shrink-0">{icon}</View>}
      {typeof children === "string" ? (
        <Text className={buttonText({ variant: resolvedVariant, size })}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};