insert into public.profiles (clerk_user_id, handle, display_name, role, headline, bio, interests)
values
  ('user_demo_alice', 'alice_lab', 'Alice Lab', 'student', 'Physics revision lead', 'Building study systems for mechanics and waves.', array['Physics', 'Mathematics']),
  ('user_demo_ben', 'ben_bio', 'Ben Bio', 'researcher', 'Neuroscience early-career researcher', 'Interested in neural data, cognition, and collaboration.', array['Biology', 'Neuroscience']),
  ('user_demo_nia', 'nia_chem', 'Nia Chem', 'educator', 'Organic chemistry tutor', 'Runs reaction-mechanism workshops for undergraduates.', array['Chemistry'])
on conflict (clerk_user_id) do nothing;

insert into public.follows (follower_id, following_id)
values
  ('user_demo_alice', 'user_demo_ben'),
  ('user_demo_ben', 'user_demo_nia')
on conflict do nothing;

insert into public.notifications (user_id, actor_id, type, title, body, href)
values
  ('user_demo_ben', 'user_demo_alice', 'follow', 'You have a new follower', 'Alice started following your profile.', '/u/ben_bio'),
  ('user_demo_nia', 'user_demo_ben', 'message', 'New direct message', 'Ben wants to compare neuroscience and chemistry teaching approaches.', '/messages')
on conflict do nothing;
