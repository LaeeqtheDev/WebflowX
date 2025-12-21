declare module '*.css';


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
      [key: string]: any; // allow extra props
    }
  
    interface CardProps {
      children?: ReactNode;
      className?: string;
      shadow?: boolean;
      [key: string]: any;
    }
  
    interface CardBodyProps {
      children?: ReactNode;
      className?: string;
      [key: string]: any;
    }
  
    interface AvatarProps {
      size?: string;
      variant?: string;
      alt?: string;
      src?: string;
      className?: string;
      [key: string]: any;
    }
  
    export const Typography: FC<TypographyProps>;
    export const Card: FC<CardProps>;
    export const CardBody: FC<CardBodyProps>;
    export const Avatar: FC<AvatarProps>;
  }
  