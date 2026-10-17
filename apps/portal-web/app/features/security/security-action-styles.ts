import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

// Limit overrides to enabled controls so Fluent retains its disabled and focus states.
const forcedColors = {
  "&:enabled": {
    color: "ButtonText",
    backgroundColor: "ButtonFace",
    ...shorthands.borderColor("ButtonText"),
    ":hover": {
      color: "HighlightText",
      backgroundColor: "Highlight",
      ...shorthands.borderColor("Highlight"),
    },
    ":active": {
      color: "HighlightText",
      backgroundColor: "Highlight",
      ...shorthands.borderColor("Highlight"),
    },
  },
} as const;

export const useSecurityActionStyles = makeStyles({
  danger: {
    "&:enabled": {
      color: tokens.colorStatusDangerForeground1,
      ...shorthands.borderColor(tokens.colorStatusDangerBorder2),
      ":hover": {
        color: tokens.colorStatusDangerForeground2,
        backgroundColor: tokens.colorStatusDangerBackground1,
        ...shorthands.borderColor(tokens.colorStatusDangerBorderActive),
      },
      ":active": {
        color: tokens.colorStatusDangerForeground2,
        backgroundColor: tokens.colorStatusDangerBackground2,
        ...shorthands.borderColor(tokens.colorStatusDangerBorderActive),
      },
    },
    "@media (forced-colors: active)": forcedColors,
  },
  dangerPrimary: {
    "&:enabled": {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: tokens.colorStatusDangerBackground3,
      ...shorthands.borderColor(tokens.colorStatusDangerBackground3),
      ":hover": {
        color: tokens.colorNeutralForegroundOnBrand,
        backgroundColor: tokens.colorStatusDangerBackground3Hover,
        ...shorthands.borderColor(tokens.colorStatusDangerBackground3Hover),
      },
      ":active": {
        color: tokens.colorNeutralForegroundOnBrand,
        backgroundColor: tokens.colorStatusDangerBackground3Pressed,
        ...shorthands.borderColor(tokens.colorStatusDangerBackground3Pressed),
      },
    },
    "@media (forced-colors: active)": forcedColors,
  },
});
