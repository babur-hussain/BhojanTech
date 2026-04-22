/**
 * Deep linking configuration for React Navigation.
 * Handles restaurantapp:// URLs from Firebase Dynamic Links / SMS invites.
 */
import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
    prefixes: ['restaurantapp://'],
    config: {
        screens: {
            Auth: {
                screens: {
                    Onboarding: 'invite', // restaurantapp://invite?token=xxx&restaurantId=yyy
                },
            },
        },
    },
};
