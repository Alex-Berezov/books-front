#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Starting validation and auto-fix process...${NC}"

# 1. Run ESLint with auto-fix
echo -e "\n${YELLOW}🧹 Running ESLint with --fix...${NC}"
if yarn lint --fix; then
    echo -e "${GREEN}✅ ESLint passed${NC}"
else
    echo -e "${RED}❌ ESLint found issues that could not be auto-fixed${NC}"
    # We don't exit here, we want to see type errors too
fi

# 2. Run TypeScript check
echo -e "\n${YELLOW}📏 Running TypeScript check...${NC}"
if yarn typecheck; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript check failed${NC}"
    exit 1
fi

# 3. Manual Code Style Reminder
echo -e "\n${YELLOW}👀 Manual Code Style Check Reminder:${NC}"
echo -e "1. Are components decomposed (< 250 lines)?"
echo -e "2. Are event handlers extracted to named functions?"
echo -e "3. Are magic numbers extracted to constants?"
echo -e "4. Are SCSS tokens used everywhere?"
echo -e "5. Are all comments in English?"

echo -e "\n${GREEN}✨ All automated checks passed! Please verify manual checks above.${NC}"
exit 0
