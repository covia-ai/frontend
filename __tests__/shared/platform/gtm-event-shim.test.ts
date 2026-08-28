/**
 * `gtmEvent` is the product event surface every call site uses. These tests
 * pin the mapping from each helper to the events that actually leave the app,
 * including the deprecated GA4 names kept alive across the GTM cutover.
 */

jest.mock('@/lib/analytics', () => ({
  __esModule: true,
  track: jest.fn(),
  trackLegacyAlias: jest.fn(),
  trackPageView: jest.fn(),
}));

import { gtmEvent } from '@/lib/utils';
import { track, trackLegacyAlias, trackPageView } from '@/lib/analytics';

const mockTrack = jest.mocked(track);
const mockAlias = jest.mocked(trackLegacyAlias);
const mockPageView = jest.mocked(trackPageView);

beforeEach(() => jest.clearAllMocks());

describe('gtmEvent → D070 taxonomy', () => {
  it('reports a sign-in as product_login', () => {
    gtmEvent.signUp('keypair');
    expect(mockTrack).toHaveBeenCalledWith('product_login', {
      method: 'keypair',
    });
  });

  it('reports a new DID as agent_did_issued and product_signup', () => {
    gtmEvent.didIssued('user', 'keys-panel');
    expect(mockTrack).toHaveBeenCalledWith('agent_did_issued', {
      type: 'user',
      source: 'keys-panel',
    });
    expect(mockTrack).toHaveBeenCalledWith('product_signup', {
      source: 'keys-panel',
    });
  });

  it('rolls a top feature up into product_feature_used', () => {
    gtmEvent.createAgent('agent-1', 'openai');
    expect(mockTrack).toHaveBeenCalledWith('create_agent', {
      agent_id: 'agent-1',
      provider: 'openai',
    });
    expect(mockTrack).toHaveBeenCalledWith('product_feature_used', {
      feature_id: 'create_agent',
    });
  });

  it('treats running an operation as a feature use', () => {
    gtmEvent.buttonClick('Invoke Operation', 'echo');
    expect(mockTrack).toHaveBeenCalledWith('product_feature_used', {
      feature_id: 'run_operation',
    });
  });

  it('does not roll an unremarkable button click up into a feature', () => {
    gtmEvent.buttonClick('Cancel Job', 'job-1');
    expect(mockTrack).not.toHaveBeenCalledWith(
      'product_feature_used',
      expect.anything(),
    );
  });

  it('delegates page views to the analytics module', () => {
    gtmEvent.pageView('/jobs', 'Covia');
    expect(mockPageView).toHaveBeenCalledWith('/jobs', 'Covia');
  });
});

describe('deprecated GA4 names kept for report continuity', () => {
  /*
   * The retired GTM container renamed two events on their way to GA4. These
   * aliases reproduce that exact shape so existing reports do not go flat at
   * the cutover. Remove them together with EMIT_LEGACY_ALIASES.
   */

  it('still emits sign_up alongside product_login', () => {
    gtmEvent.signUp('oauth');
    expect(mockAlias).toHaveBeenCalledWith('sign_up', { method: 'oauth' });
  });

  it('still emits click alongside button_click, mapping button_label', () => {
    gtmEvent.buttonClick('Cancel Job', 'job-1');

    expect(mockTrack).toHaveBeenCalledWith('button_click', {
      button_name: 'Cancel Job',
      custom_param: 'job-1',
    });
    // The container mapped button_name → button_label and passed
    // custom_param through unchanged.
    expect(mockAlias).toHaveBeenCalledWith('click', {
      button_label: 'Cancel Job',
      custom_param: 'job-1',
    });
  });

  it('leaves the sixteen pass-through product events unaliased', () => {
    gtmEvent.connectVenue('venue-1');
    gtmEvent.createAsset('asset-1');
    gtmEvent.sendAgentMessage('agent-1');
    gtmEvent.removeVenue('venue-1');

    // The container forwarded these under their own names, so an alias would
    // be a duplicate rather than continuity.
    expect(mockAlias).not.toHaveBeenCalled();
  });
});
