# Google Tag Manager Event Schema

GTM events are sent via `sendGTMEvent` from `next-third-parties/google`. The utility layer is defined in `src/lib/utils.ts` as the `gtmEvent` object.

## Event Types

### button_click

Tracks user-initiated button clicks on key actions.

| Field          | Type   | Description                        |
| -------------- | ------ | ---------------------------------- |
| `event`        | string | Always `"button_click"`            |
| `button_name`  | string | Identifier for the button/action   |
| `custom_param` | string | Contextual value for the action    |

**Usage:** `gtmEvent.buttonClick(buttonName, param)`

#### Active Events

| button_name        | custom_param                   | Source File                        | Trigger                                  |
| ------------------ | ------------------------------ | ---------------------------------- | ---------------------------------------- |
| `Sign Up`          | OAuth provider name            | `src/lib/actions/auth.ts`          | User signs up via OAuth                  |
| `Sign Out`         | `"NA"`                         | `src/lib/actions/auth.ts`          | User signs out                           |
| `Add Venue`        | Venue DID or URL               | `src/components/AddNewVenueModal.tsx` | User connects a new venue             |
| `Create Asset`     | Asset name                     | `src/components/CreateAssetComponent.tsx` | User creates a new asset          |
| `Invoke Operation` | Operation name, asset ID, or `"unknown"` | `src/components/OperationViewer.tsx` | User runs an operation             |
| `Cancel Job`       | Job ID                         | `src/components/ExecutionToolbar.tsx` | User cancels a running job           |
| `Pause Job`        | Job ID                         | `src/components/ExecutionToolbar.tsx` | User pauses a running job            |
| `Resume Job`       | Job ID                         | `src/components/ExecutionToolbar.tsx` | User resumes a paused job            |
| `Delete Job`       | Job ID                         | `src/components/ExecutionToolbar.tsx` | User deletes a finished job          |

---

### page_view

Tracks client-side page navigations.

| Field        | Type   | Description              |
| ------------ | ------ | ------------------------ |
| `event`      | string | Always `"page_view"`     |
| `page_path`  | string | URL path of the page     |
| `page_title` | string | Document title           |

**Usage:** `gtmEvent.pageView(pagePath, pageTitle)`

Fired automatically on route change by `src/components/PageViewTracker.tsx`.

---

### form_submit

Tracks form submissions. Currently defined but **not in use**.

| Field       | Type   | Description                    |
| ----------- | ------ | ------------------------------ |
| `event`     | string | Always `"form_submit"`         |
| `form_name` | string | Identifier for the form        |
| `form_id`   | string | Optional form element ID       |

**Usage:** `gtmEvent.formSubmit(formName, formId?)`

---

### custom

Sends an arbitrary event with custom parameters. Currently defined but **not in use**.

| Field    | Type   | Description                          |
| -------- | ------ | ------------------------------------ |
| `event`  | string | Custom event name                    |
| `...`    | any    | Additional key-value pairs as params |

**Usage:** `gtmEvent.custom(eventName, params?)`
