import { Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";

export const useResetNavigationOnUnmount = (route: Href) => {
      const router = useRouter();
    
      useFocusEffect(
        useCallback(() => {
          // When the leads tab is focused, reset to root
          // This clears any nested screens like create
          router.replace(route);
        }, [router])
      );
}