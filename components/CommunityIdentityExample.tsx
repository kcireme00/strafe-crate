/*
Inside LiveChat.tsx, extend each loaded message/user with:

featured_trophy_slug
featured_trophy_name
featured_trophy_rarity
tier_name
tier_color
collector_level

Then replace the current username / level / tier markup with:

<CommunityIdentity
  displayName={message.display_name}
  level={message.collector_level}
  tierLabel={message.tier_name || "Membership pending"}
  tierColor={message.tier_color}
  trophySlug={message.featured_trophy_slug}
  trophyName={message.featured_trophy_name}
  trophyRarity={message.featured_trophy_rarity}
  onClick={() => openCard(message.user_id)}
/>

Import:

import CommunityIdentity from "@/components/CommunityIdentity";

The SQL function get_public_community_identity(user_id) returns these exact
fields and always uses featured trophy slot 1, matching the first emblem on the
saved public player card.
*/
