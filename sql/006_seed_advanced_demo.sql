
insert into public.workspace_profiles (clerk_org_id, owner_id, name, slug, description, workspace_type, is_public)
values
  ('org_demo_biophysics', 'user_demo_alice', 'Biophysics Society', 'biophysics-society', 'Student-led space for physics, biology, and instrumentation projects.', 'student_club', true),
  ('org_demo_neuro_lab', 'user_demo_ben', 'Neuro Data Lab', 'neuro-data-lab', 'Shared workspace for cognitive neuroscience reading and collaboration.', 'lab', true)
on conflict (clerk_org_id) do nothing;

insert into public.reputations (user_id, score, helpful_answers, contributions, mentor_sessions, verified_expert)
values
  ('user_demo_alice', 42, 3, 8, 1, false),
  ('user_demo_ben', 88, 7, 11, 4, true),
  ('user_demo_nia', 97, 12, 10, 9, true)
on conflict (user_id) do update
set score = excluded.score,
    helpful_answers = excluded.helpful_answers,
    contributions = excluded.contributions,
    mentor_sessions = excluded.mentor_sessions,
    verified_expert = excluded.verified_expert;

insert into public.user_wallets (user_id, balance_credits, lifetime_earned_credits)
values
  ('user_demo_alice', 140, 190),
  ('user_demo_ben', 215, 260),
  ('user_demo_nia', 320, 380)
on conflict (user_id) do nothing;

insert into public.research_clubs (workspace_id, title, slug, description, cadence, owner_id)
select id, 'Neuroscience Paper Club', 'neuroscience-paper-club', 'Weekly critique of methods, datasets, and experimental design.', 'weekly', 'user_demo_ben'
from public.workspace_profiles
where clerk_org_id = 'org_demo_neuro_lab'
on conflict (slug) do nothing;

insert into public.lab_projects (workspace_id, title, slug, summary, status, owner_id)
select id, 'Microscopy annotation benchmark', 'microscopy-annotation-benchmark', 'Compare annotation quality across open datasets and toolchains.', 'active', 'user_demo_alice'
from public.workspace_profiles
where clerk_org_id = 'org_demo_biophysics'
on conflict (slug) do nothing;

insert into public.resource_vault_items (owner_id, title, slug, description, content_markdown, visibility, premium_only, tags)
values
  ('user_demo_nia', 'Organic Chemistry Reaction Pack', 'organic-chemistry-reaction-pack', 'Compact premium-friendly revision notes for reaction mechanisms.', 'SN1, SN2, E1, and E2 patterns with memorisable cues.', 'premium', true, array['chemistry','revision','organic']),
  ('user_demo_alice', 'Mechanics Formula Sheet', 'mechanics-formula-sheet', 'Public formula list for forces, momentum, and energy.', 'Use with worked examples and free-body diagrams.', 'public', false, array['physics','mechanics'])
on conflict (slug) do nothing;

insert into public.question_bounties (author_id, title, body, tags, reward_credits, status)
values
  ('user_demo_alice', 'Why does PCA distort my clustering after standardisation?', 'I need an explanation of the geometry and a practical fix.', array['statistics','machine learning'], 35, 'open')
on conflict do nothing;

insert into public.events (organizer_id, title, slug, description, event_type, scheduled_for, premium_only)
values
  ('user_demo_nia', 'Reaction Mechanisms Live Session', 'reaction-mechanisms-live-session', 'Premium live walkthrough of common undergraduate mechanism patterns.', 'webinar', now() + interval '7 days', true),
  ('user_demo_ben', 'Weekly Neuro Methods Office Hours', 'weekly-neuro-methods-office-hours', 'Bring a dataset, paper, or analysis roadblock.', 'office_hours', now() + interval '3 days', false)
on conflict (slug) do nothing;

insert into public.campus_chapters (slug, name, campus_name, region, description, lead_user_id)
values
  ('ucl-science-collective', 'Science Collective', 'University College London', 'London', 'Cross-discipline science community for students and early researchers.', 'user_demo_alice')
on conflict (slug) do nothing;

insert into public.chapter_members (chapter_id, user_id, role)
select id, 'user_demo_alice', 'owner' from public.campus_chapters where slug = 'ucl-science-collective'
on conflict do nothing;

insert into public.verification_requests (user_id, verification_type, evidence_url, note, status)
values
  ('user_demo_ben', 'researcher', 'https://example.com/ben', 'Early-career neuroscience researcher sharing methods guidance.', 'approved')
on conflict do nothing;

insert into public.call_recordings (title, provider, transcript_text, transcript_status, is_public, created_by)
values
  ('Spectroscopy office hours recap', 'zoom_video', 'Today we covered calibration, noise sources, and basic preprocessing.', 'ready', true, 'user_demo_nia')
on conflict do nothing;
