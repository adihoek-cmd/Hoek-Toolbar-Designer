// Only fill missing icons on existing user-created buttons; never replace newer edits.
export const approvedIcons = {
  "960c814b-0880-41df-a4ad-f0d53964d666": {
    "key": "C",
    "src": "assets/approved-960c814b-0880-41df-a4ad-f0d53964d666.svg"
  },
  "6828be46-bca2-4240-9196-c0c50728f42c": {
    "key": "B",
    "src": "assets/approved-6828be46-bca2-4240-9196-c0c50728f42c.svg"
  },
  "c2a08bd7-af13-4eb7-89b7-c3534091c3f5": {
    "key": "A",
    "src": "assets/approved-c2a08bd7-af13-4eb7-89b7-c3534091c3f5.svg"
  },
  "715c467d-ca1c-4423-8d4f-4cb2c7f3a6e5": {
    "key": "A",
    "src": "assets/approved-715c467d-ca1c-4423-8d4f-4cb2c7f3a6e5.svg"
  },
  "d086201f-488f-4288-ba19-4deaf4d95173": {
    "key": "A",
    "src": "assets/approved-d086201f-488f-4288-ba19-4deaf4d95173.svg"
  },
  "26e5b14b-c881-498e-ba59-cb077f206e6d": {
    "key": "B",
    "src": "assets/approved-26e5b14b-c881-498e-ba59-cb077f206e6d.svg"
  },
  "8c855a65-4a87-4dae-bcbd-439c0a2c6e6c": {
    "key": "B",
    "src": "assets/approved-8c855a65-4a87-4dae-bcbd-439c0a2c6e6c.svg"
  }
};
export function applyApprovedIcons(state){let count=0;for(const n of state.nodes){const a=approvedIcons[n.id];if(a&&!n.icon){n.icon=a.src;n.iconChoice='approved-'+a.key;count++;}}return count;}
