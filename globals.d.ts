declare module '*.css';

//file for the global definition

// global.d.ts
declare module "@material-tailwind/react" {
    import { FC, ReactNode } from "react";
  
    interface TypographyProps {
      children?: ReactNode;
      className?: string;
      color?: string;
      variant?: string;
      as?: string;
      href?: string;
      [key: string]: unknown; // allow extra props
    }
  
    interface CardProps {
      children?: ReactNode;
      className?: string;
      shadow?: boolean;
      [key: string]: unknown;
    }
  
    interface CardBodyProps {
      children?: ReactNode;
      className?: string;
      [key: string]: unknown;
    }
  
    interface AvatarProps {
      size?: string;
      variant?: string;
      alt?: string;
      src?: string;
      className?: string;
      [key: string]: unknown;
    }
  
    export const Typography: FC<TypographyProps>;
    export const Card: FC<CardProps>;
    export const CardBody: FC<CardBodyProps>;
    export const Avatar: FC<AvatarProps>;
  }
  
