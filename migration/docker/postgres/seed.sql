-- Disable FK checks during import
SET session_replication_role = replica;

-- POC Course Data Export
-- Generated: 2025-12-13T17:50:48.726Z
-- Courses: fix-common-git-mistakes

-- Users (1)
INSERT INTO users (id, email, encrypted_password, reset_password_token, reset_password_sent_at, remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at, current_sign_in_ip, last_sign_in_ip, created_at, updated_at, first_name, last_name, confirmation_token, confirmed_at, confirmation_sent_at, unconfirmed_email, avatar_url, can_contact, managed_subscription_id, authentication_token, favorite_playlist_id, provider, uid, has_random_password, is_banned, avatar_file_name, avatar_content_type, avatar_file_size, avatar_updated_at, slack_id, is_invited_to_slack, country, city, state, trial_started_at, kvstore, community_status, discord_id) VALUES (265830, 'user265830@test.egghead.io', 'redacted', NULL, NULL, '2018-10-27T08:31:15.827Z', 5693, '2025-08-25T04:35:12.053Z', '2025-08-23T04:02:30.747Z', NULL, NULL, '2018-04-19T07:03:07.301Z', '2025-08-25T04:35:12.164Z', 'Chris', '', NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 239323, NULL, NULL, NULL, false, 'chris_new.png', 'image/png', 361300, '2019-09-27T23:52:34.902Z', NULL, false, 'US', 'Ashburn', 'VA', NULL, '{"local_timezone":"America/New_York","drip_import_data":{"cc":"","id":"265830","ltv":"","tag":"","dbid":"","euid":"","leid":"","name":"Chris","paid":"","tags":"completed lesson tagged with react,ILC SE02: completed lesson creation 101,first lesson published,first lesson uploaded,completed course - Record Badass Screencasts for egghead.io,started course - Record Badass Screencasts for egghead.io,instructor invite claimed,ILC SE01: instructor being recuited,instructor invited","email":"chris@nanohop.com","goals":"","tag_0":"","total":"","dstoff":"","gmtoff":"","is_pro":"false","lesson":"","region":"","status":"active","account":"","user_id":"265830","identify":"","interval":"none","lastName":"","latitude":"","loggedIn":"","optin_ip":"","referrer":"","username":"","RCPStatus":"","createdAt":"","firstName":"","how_learn":"","isManager":"","job_title":"","last_name":"Achard","longitude":"","managerID":"","plan_name":"none","time_zone":"","timestamp":"","confirm_ip":"","created_at":"2018-04-18T19:03:07","first_name":"Chris","ip_address":"","lead_score":"","lessonSlug":"","optin_time":"","super_cool":"","technology":"","utc_offset":"","RCPStripeID":"","can_contact":"true","landing_url":"","lessonTitle":"","react_score":"","teamAccount":"","cancelled_on":"","confirm_time":"","confirmed_at":"2018-04-18T23:35:00Z","current_plan":"","from_website":"","last_changed":"","member_since":"","transactions":"","cancel_reason":"","company_stage":"","gumroad_buyer":"","instructor_id":"chris-achard","is_instructor":"true","lastVisitedAt":"","member_rating":"","opt_in_course":"","opt_in_lesson":"","campaign_names":"","framework_pref":"","lifetime_value":"","pro_subscriber":"false","subscriptionID":"","registered_from":"","completed_lessons":"15","opt_in_technology":"","published_lessons":"6","subscriptionLevel":"","subscriptionPrice":"","cart_offer_expires":"","current_course_url":"https://egghead.io/courses/safer-javascript-with-the-maybe-type","last_lesson_viewed":"","subscriptionActive":"","RCPPayPalSubscriber":"","RCPStripeSubscriber":"","last_lesson_view_at":"","last_lesson_watched":"react-introducing-advanced-react-component-patterns","open_source_contrib":"","react_experiment_id":"","react_offer_expires":"","current_course_title":"Safer JavaScript with the Maybe Type","angular_experiment_id":"","instructor_invite_url":"https://egghead.io/instructors/invite/49e93f-9c","last_lesson_completed":"react-introducing-advanced-react-component-patterns","subscriptionRecurring":"","instructor_invite_guid":"49e93f-9c","last_lesson_watched_at":"2018-07-18T10:52:12","open_source_motivation":"","last_transaction_amount":"","instructor_invited_email":"zac@egghead.io","last_lesson_completed_at":"2018-07-18T10:52:12","current_course_started_on":"2018-07-18T10:53:15","current_course_technology":"JavaScript","current_course_description":"JavaScript’s dynamic typing makes it incredibly flexible. That flexibility can lead to trouble though. When values have the potential to change types or to end up as null or undefined, that can lead to runtime errors in our code or bizarre bugs that take forever to track down because of type coercion. To battle this, we end up with code that is littered will conditionals for null or undefined values and type checks, making the core logic harder to read and refactor later. \nThe Maybe encapsulates the type checking and guards against missing values for us. With Maybe in our toolbelt, we can keep our functions free of all the guardrails, outsource that work to the Maybe and keep our business logic free of all the clutter.\n","current_course_is_complete":"false","upgrade_from_monthly_expires":"","current_course_last_lesson_url":"https://egghead.io/lessons/tools-edit-with-ripple-delete","current_course_last_watched_on":"","current_course_next_lesson_url":"https://egghead.io/lessons/javascript-course-introduction-safer-javascript-with-the-maybe-type","current_course_last_lesson_title":"Edit with Ripple Delete","current_course_next_lesson_title":"Course Introduction: Safer JavaScript with the Maybe type","instructor_invited_by_first_name":"Zac","current_course_last_lesson_summary":"Editing a raw lesson video is a very simple process. You simply watch your own lesson and edit out all the bad takes and dead space using the \"Ripple Delete\" command. You will be left with a nice, cut lesson ready to export and upload.\n","current_course_next_lesson_summary":"JavaScript''s dynamic typing makes the language incredibly flexible. That flexibility comes at a cost. Because any variable can potentially be of any type, it''s easy to inadvertently introduce runtime Type errors into an application.\nThe Maybe data type encapsulates the defensive coding needed to avoid such errors, keeping our application code focused on the task at hand.\nIn this course, we''ll look at the Maybe type in action. We''ll be relying on the Maybe exposed by the crocks library, but the core concepts and much of the API translates to other implementations. We''ll learn how to construct a Maybe and apply transformations to data within those safe confines. We''ll also cover point-free utility functions that let us build up function compositions for working with Maybes\nAfter completing this course, you''ll have the tools to write safe, declarative JavaScript that can be easily composed while avoiding the unnecessary noise of sprinkling imperative conditional statements...\n","current_course_completed_lesson_count":"0"},"affiliate_code":"8c1krm","country_name":"United States"}', 'joined', NULL) ON CONFLICT (id) DO NOTHING;

-- Instructors (1)
INSERT INTO instructors (id, first_name, last_name, profile_picture_url, twitter, website, bio_short, created_at, updated_at, avatar_file_name, avatar_content_type, avatar_file_size, avatar_updated_at, percentage, user_id, slug, trained_by_instructor_id, slack_id, state, email, gear_tracking_number, contract_id, avatar_processing, slack_group_id, skip_onboarding, internal_note) VALUES (210, 'Chris', 'Achard', NULL, 'chrisachard', 'https://chrisachard.com', 'Teaching everything I know about React, React Native, Ruby on Rails, Node.js, and machine learning!', '2018-04-19T07:09:18.947Z', '2022-08-13T02:46:14.208Z', 'chris_new.png', 'image/png', 361300, '2019-09-13T19:54:22.694Z', '0.20', 265830, 'chris-achard', NULL, 'U030CS0r0', 'signed', 'instructor210@test.egghead.io', NULL, '9b2ca1a4defab6378f60162aca14dfa5ec6afa17', false, 'G70JH2Y7P', NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Series/Courses (1)
INSERT INTO series (id, title, description, instructor_id, created_at, updated_at, slug, is_complete, tweeted_on, purchase_price, state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, row_order, published_at, queue_order, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, free_forever, tagline, summary, kvstore, square_cover_processing, publish_subject, publish_body, repo, publish_at, price, revshare_percent, site, visibility_state, resources_id) VALUES (401, 'Fix Common Git Mistakes', 'This workshop will start by breaking down the four states in which a file can exist, and we''ll build up our mental model of git from there. Then, we''ll look at how to move files between those states in different ways.

Once we''ve developed a new model for how git operates, we''ll be able to purposefully get ourselves into some sticky situations, and then gracefully recover from them.

If you can handle git add/commit/push, but not much more - then this workshop is perfect for you.

You can finally get some proper git training, and will never have to worry about losing data or messing up the repo again!', 210, '2019-11-06T04:25:07.214Z', '2021-02-14T03:41:00.385Z', 'fix-common-git-mistakes', false, NULL, NULL, 'published', 'GitMistakes_1000.png', 'image/png', 592168, '2019-11-20T03:44:12.854Z', -8308993, '2019-12-12T02:34:02.743Z', 8372224, NULL, '', '', '', 'git', '', '', '', false, NULL, '', '{"transferPlaylistSlug":"fix-common-git-mistakes"}'::jsonb, false, NULL, NULL, NULL, NULL, NULL, NULL, 'egghead.io', 'indexed', '339890') ON CONFLICT (id) DO NOTHING;

-- Lessons (20)
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5765, 'Change a Commit Message that Hasn''t Been Pushed Yet', NULL, 'If you make a mistake in a commit message but HAVEN''T pushed it yet, you can change that commit message with --amend:

`git commit --amend -m "New message"`

This won''t change any of the files in your commit - but will rewrite the commit with the new message.', 107, NULL, '2019-11-28T03:51:11.019Z', '2025-12-13T00:54:53.678Z', 'git-change-a-commit-message-that-hasn-t-been-pushed-yet', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B.jpg', true, NULL, 'Instructor: [0:00] Let''s start a new git project by going to New on GitHub and entering a repository name of git_mistakes. I''ll make that public and initialize it with a README.

[0:14] Once it''s created, I can find the clone link and in a terminal I will git clone that repository. Then I can cd into it. I''m going to touch index.html, which''ll be the first file that we make. In a text editor, we can open that folder.

[0:35] In our index.html file, let''s paste in some HTML. Now we want to add this to a commit. First, let''s do a git status to see that we have index.html that is not tracked yet. It''s untracked. We can add index.html. Now if we do a git status, we have it as changes to be committed.

[0:56] This is what we call staged or in the index. We can commit that with git commit -m. We''ll say adding index.html to git mistooks.

[1:08] As soon as I type that, I realize that I said mistooks instead of mistakes, so I want to change that commit message. Since I haven''t pushed this yet, I can just say git commit --ammend. Now I can say that I want to give it a new message of adding index.html to git mistakes.

[1:30] If I do a git log --oneline, I can see I have my initial commit that GitHub made when it made the project, and then I have my adding index.html to git mistakes. It actually rewrote the commit message that had a typo in it.', NULL, false, '01-egghead-git-change-a-commit-message-that-hasn-t-been-pushed-yet.mp4', 210, true, false, 401, '---
mp4: 10514175
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B.mp4', 'git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B', 'zduw', 'https://egghead-pipeline.s3.amazonaws.com/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B.mp3?55651d9a664e5347?098c', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.603Z', NULL, 8388602, NULL, 7252, 0, NULL, -2752511, 'e0cfe3e909a84610846ee1c7fe102331', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 141111736, '1
00:00:00,430 --> 00:00:02,300
Let''s start a new git project by 

2
00:00:02,300 --> 00:00:04,540
going to New on GitHub and 

3
00:00:04,540 --> 00:00:06,250
entering a repository name of 

4
00:00:06,330 --> 00:00:09,190
git_mistakes. I''ll make that 

5
00:00:09,190 --> 00:00:10,950
public and initialize it with a 

6
00:00:10,950 --> 00:00:15,120
README. Once it''s created, I 

7
00:00:15,120 --> 00:00:18,250
can find the clone link and in a 

8
00:00:18,250 --> 00:00:20,850
terminal I will git clone that 

9
00:00:20,850 --> 00:00:24,090
repository. Then I can cd into 

10
00:00:25,090 --> 00:00:27,320
it. I''m going to touch index.

11
00:00:27,520 --> 00:00:29,300
html, which''ll be the first file 

12
00:00:29,300 --> 00:00:31,720
that we make. In a text editor, 

13
00:00:31,930 --> 00:00:35,850
we can open that folder. In our 

14
00:00:35,850 --> 00:00:38,260
index.html file, let''s paste in 

15
00:00:38,260 --> 00:00:40,500
some HTML. Now we want to add 

16
00:00:40,500 --> 00:00:42,800
this to a commit. First, let''s 

17
00:00:42,800 --> 00:00:44,360
do a git status to see that we 

18
00:00:44,360 --> 00:00:46,730
have index.html that is not 

19
00:00:47,070 --> 00:00:49,490
tracked yet. It''s untracked. We 

20
00:00:49,490 --> 00:00:52,760
can add index.html. Now if we do 

21
00:00:52,760 --> 00:00:54,780
a git status, we have it as 

22
00:00:54,780 --> 00:00:56,350
changes to be committed. This 

23
00:00:56,350 --> 00:00:58,020
is what we call staged or in the 

24
00:00:58,020 --> 00:01:00,130
index. We can commit that with 

25
00:01:00,190 --> 00:01:03,030
git commit -m. We''ll say adding 

26
00:01:03,100 --> 00:01:08,460
index.html to git mistooks. As 

27
00:01:08,460 --> 00:01:09,760
soon as I type that, I realize 

28
00:01:09,760 --> 00:01:11,350
that I said mistooks instead of 

29
00:01:11,350 --> 00:01:13,000
mistakes, so I want to change 

30
00:01:13,000 --> 00:01:14,870
that commit message. Since I 

31
00:01:14,870 --> 00:01:16,080
haven''t pushed this yet, I can 

32
00:01:16,080 --> 00:01:18,810
just say git commit --ammend. 

33
00:01:19,470 --> 00:01:21,780
Now I can say that I want to 

34
00:01:21,780 --> 00:01:23,590
give it a new message of adding 

35
00:01:23,880 --> 00:01:30,430
index.html to git mistakes. If 

36
00:01:30,430 --> 00:01:34,030
I do a git log --oneline, I can 

37
00:01:34,030 --> 00:01:35,350
see I have my initial commit 

38
00:01:35,550 --> 00:01:36,790
that GitHub made when it made 

39
00:01:36,790 --> 00:01:39,090
the project, and then I have my 

40
00:01:39,150 --> 00:01:40,890
adding index.html to git 

41
00:01:41,000 --> 00:01:42,750
mistakes. It actually rewrote 

42
00:01:42,750 --> 00:01:43,950
the commit message that had a 

43
00:01:43,950 --> 00:01:44,780
typo in it.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'To start a new Git project, go to `New` on Github and enter a repository name. After creating the repository, find the clone link for the repo and `git clone <repo-link>`. You can then `cd` into that folder and `touch index.html` to create your first file. Inside your `index.html` file you can insert code and add the file to your commit.

## index.html
```html
<html>
  <head>
  </head>
  <body>

    <h1>Fixing git mistakes</h1>

  </body>
</html>  
```

You can do a `git status` and see that the `index.html` is an untracked file. Once you `git add index.html`, it stages the file and prepares it for a commit. You can commit that with a message like `git commit -m "Adding index.html to git-mistokes"`.

After typing the commit message, we see we typed it incorrectly and want to change it. Since we haven''t pushed it yet, you can use `git commit --amend -m "Adding index.html to git-mistakes"` to change the message. Now, if we `git log --oneline`, we can see the initial commit Github made to the project along with our rewritten message `Adding index.html to git-mistakes`.

# Personal Take

`git commit --amend` is a very useful feature I know I''ll use in the future should I mess up my commit messages. There are plenty of times I would simply just abandon a commit to retype a message, as I had no idea this feature existed. I like the simplicity of this lesson, the approach helps all levels of experience.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '54b22329', 'https://d2c5owlt6rorc3.cloudfront.net/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B/dash/git-change-a-commit-message-that-hasn-t-been-pushed-yet-rJ__noh2B.mpd', 'https://stream.mux.com/RhrJbClGWX1ag02HTvmfMERnVV74vp2eBMf004nil8CEc.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5766, 'Add More Files and Changes to a Commit Before Pushing', NULL, 'To add more files to the most recent commit, we can add them to the staging area with:

`git add -A`

and then rewrite the most recent commit to include them with:

`git commit --amend -m "My new message"`

Caution: only do this BEFORE you''ve pushed the commits - otherwise you will be re-writing history for people who may have already pulled down the old commits.', 94, NULL, '2019-11-28T04:15:22.652Z', '2025-12-13T00:54:53.678Z', 'git-add-more-files-and-changes-to-a-commit-before-pushing', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr.jpg', true, NULL, 'Instructor: [0:00] I have a project with one HTML file and if I do git log oneline here, we can see that HTML file was added in this commit. Let''s say I want to add a couple more files to that same commit. We can touch app.js for example and open that up. Inside of here, this will be our App.js code.

[0:20] To see that, we need to add it in the head, so we can type script, [inaudible] text.JavaScript. The actual files we''re making here don''t matter so much, but for our project, we want to have at least two files.

[0:36] Now we have the script tag added to our HTML. If we do a git status here, we can see that we have one untracked file. That''s our new app.js file and one modified file, that''s index.html. We want to add those to the same commit. If we do git log again, we only want one commit here.

[0:56] What we can do is actually add this to the stage, so we can do git add -a for add all. Now if we do a git status, we have changes to be committed and we can use git commit.

[1:10] If we want to add them to that same commit, this commit, then we can do --amend and we can change the git message by saying adding index.html and app.js. Now if we do a git status, we have no changes to be committed. If we do a git log oneline, all of those files were added to the same commit and it re-wrote the commit message.', NULL, false, '02-egghead-git-add-more-files-and-changes-to-a-commit-before-pushing.mp4', 210, true, false, 401, '---
mp4: 9250457
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr.mp4', 'scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr', 'zduN', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr.mp3?bfe0c0027c25f6c2?4730', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.669Z', NULL, 8388602, NULL, 7234, 0, NULL, 1441793, 'fb1521e18af34be9b592aef618caed56', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 141782092, '1
00:00:00,440 --> 00:00:02,190
I have a project with one HTML 

2
00:00:02,190 --> 00:00:04,330
file and if I do git log oneline 

3
00:00:04,330 --> 00:00:06,460
here, we can see that HTML file 

4
00:00:06,650 --> 00:00:08,990
was added in this commit. Let''s 

5
00:00:08,990 --> 00:00:10,270
say I want to add a couple more 

6
00:00:10,270 --> 00:00:12,140
files to that same commit. We 

7
00:00:12,140 --> 00:00:14,730
can touch app.js for example and 

8
00:00:14,730 --> 00:00:16,690
open that up. Inside of here, 

9
00:00:16,690 --> 00:00:18,790
this will be our App.js code. 

10
00:00:20,220 --> 00:00:22,400
To see that, we need to add it 

11
00:00:22,470 --> 00:00:24,740
in the head, so we can type 

12
00:00:25,030 --> 00:00:27,610
script,  text.

13
00:00:27,650 --> 00:00:29,900
JavaScript. The actual files 

14
00:00:29,900 --> 00:00:30,970
we''re making here don''t matter 

15
00:00:30,970 --> 00:00:33,650
so much, but for our project, we 

16
00:00:33,650 --> 00:00:35,380
want to have at least two files. 

17
00:00:36,250 --> 00:00:38,070
Now we have the script tag added 

18
00:00:38,070 --> 00:00:40,270
to our HTML. If we do a git 

19
00:00:40,270 --> 00:00:42,100
status here, we can see that we 

20
00:00:42,100 --> 00:00:43,590
have one untracked file. That''s 

21
00:00:43,590 --> 00:00:46,360
our new app.js file and one 

22
00:00:46,360 --> 00:00:48,730
modified file, that''s index.html. 

23
00:00:49,750 --> 00:00:51,180
We want to add those to the same 

24
00:00:51,180 --> 00:00:52,790
commit. If we do git log again, 

25
00:00:54,110 --> 00:00:55,930
we only want one commit here. 

26
00:00:56,960 --> 00:00:58,420
What we can do is actually add 

27
00:00:58,420 --> 00:01:00,770
this to the stage, so we can do 

28
00:01:00,770 --> 00:01:04,160
git add -a for add all. Now if 

29
00:01:04,160 --> 00:01:05,950
we do a git status, we have 

30
00:01:05,950 --> 00:01:08,080
changes to be committed and we 

31
00:01:08,080 --> 00:01:10,930
can use git commit. If we want 

32
00:01:10,930 --> 00:01:12,250
to add them to that same commit, 

33
00:01:12,360 --> 00:01:14,050
this commit, then we can do --

34
00:01:14,300 --> 00:01:16,490
amend and we can change the git 

35
00:01:16,600 --> 00:01:19,020
message by saying adding index.

36
00:01:19,060 --> 00:01:23,720
html and app.js. Now if we do a 

37
00:01:23,720 --> 00:01:26,270
git status, we have no changes 

38
00:01:26,270 --> 00:01:27,760
to be committed. If we do a git 

39
00:01:27,760 --> 00:01:30,760
log oneline, all of those files 

40
00:01:30,760 --> 00:01:31,880
were added to the same commit 

41
00:01:32,130 --> 00:01:33,140
and it re-wrote the commit 

42
00:01:33,215 --> 00:01:33,540
message.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'We can use `git log --oneline` to see information about our previous commits like what files were added to certain commits. There is something we can do if we want to add more than one file to the same commit. We can `touch app.js` and edit it.

## app.js
```js
// our app js code
```

To see that, we need to add it in the `<head>` of the `index.html` in our previous commit. We type `<script type="text/javascript" src="/app.js"></script>`.

## index.html
```html
<html>
  <head>
    <script type="text/javascript" src="/app.js"></script>
  </head>
  <body>

    <h1>Fixing git mistakes</h1>

  </body>
</html>  
```

Now that we have our `script` tag added to our `index.html`, when we do `git status` we have one untracked file and one modified file. However, we want to add those to the same commit. To do this, we add both to the stage with `git add -A` and we have both as a change to be committed. We then `git commit --amend -m "Adding index.html and app.js"` to add them to the same previous commit. Now, with `git status`, we have no changes to be committed. A `git log --oneline`, all files were added to the same commit along with a rewritten commit message.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '4f005c36', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr/dash/scikit-learn-add-more-files-and-changes-to-a-commit-before-pushing-HJDwFLnhr.mpd', 'https://stream.mux.com/mPhDfOFFFa2Rnjlc00kZO6Xplx2F6HLczVWsZHLizzW8.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5770, 'Remove Files from Staging Before Committing', NULL, 'If you''ve added files to the staging area (the Index) accidentally - you can remove them using `git reset`.

We''ll first add a file to staging, but then back it out with:

`git reset HEAD filename`

in order to pull it back to the working directory, so it doesn''t end up in a commit when we don''t want it to.', 94, NULL, '2019-11-28T05:32:36.950Z', '2025-12-13T00:54:53.678Z', 'git-remove-files-from-staging-before-committing', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS.jpg', true, NULL, 'Instructor: [00:00] Now, let''s add another JavaScript file called limb.js and inside of limb.js, we can say that, "This is my limb file." Then, we want to do a Git status to see that it''s on tract. Let''s add the limb JS file and we''re about to commit.

[00:19] We have some changes to be committed, but then we maybe realize that we don''t actually want to commit them. We''ve added it to staging, but we don''t actually want to commit this limb file at all. The good news is that Git tells us how to fix it right here.

[00:33] We can do a Git reset HEAD and then the file name. Let''s figure out first what this head is. If we do a Git log one line, then we can see that head is a pointer to a branch and that branch is just a pointer to the commit specified by this hash.

[00:52] If we say git reset HEAD, then give it a file, it will reset this file back to what it was in this commit, which means it won''t exist. We can do git reset HEAD lib.js. Now, if we do a git status, we can see that it''s untracked. It''s removed from the staging area because it doesn''t exist in this commit.

[01:16] Now, if we want to get rid of it entirely, we can remove lib.js. If we do a git status, then we''re back to normal. We can just have our index.html and our app.js. The lib.js file is gone.', NULL, true, '03-egghead-git-remove-files-from-staging-before-committing.mp4', 210, true, false, 401, '---
mp4: 9440748
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS.mp4', 'scikit-learn-remove-files-from-staging-before-committing-SJbKownnS', 'zduP', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS.mp3?49d3c2851373449c?140d', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.296Z', NULL, 8388602, NULL, 7238, 0, NULL, 4980736, '4dfbdce063f048508d998953c6911418', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 147144940, '1
00:00:00,180 --> 00:00:01,330
Now, let''s add another 

2
00:00:01,330 --> 00:00:04,000
JavaScript file called limb.js 

3
00:00:04,790 --> 00:00:07,040
and inside of limb.js, we can 

4
00:00:07,040 --> 00:00:09,800
say that, "This is my limb file." 

5
00:00:10,780 --> 00:00:12,520
Then, we want to do a Git status 

6
00:00:12,920 --> 00:00:15,310
to see that it''s on tract. Let''s 

7
00:00:15,380 --> 00:00:17,820
add the limb JS file and we''re 

8
00:00:17,870 --> 00:00:19,780
about to commit. We have some 

9
00:00:19,780 --> 00:00:21,610
changes to be committed, but 

10
00:00:21,610 --> 00:00:22,730
then we maybe realize that we 

11
00:00:22,730 --> 00:00:23,880
don''t actually want to commit 

12
00:00:23,880 --> 00:00:26,560
them. We''ve added it to staging, 

13
00:00:26,760 --> 00:00:27,920
but we don''t actually want to 

14
00:00:27,920 --> 00:00:29,420
commit this limb file at all. 

15
00:00:30,350 --> 00:00:31,790
The good news is that Git tells 

16
00:00:31,790 --> 00:00:34,090
us how to fix it right here. We 

17
00:00:34,090 --> 00:00:36,050
can do a Git reset HEAD and then 

18
00:00:36,050 --> 00:00:38,200
the file name. Let''s figure out 

19
00:00:38,200 --> 00:00:41,310
first what this head is. If we 

20
00:00:41,310 --> 00:00:43,620
do a Git log one line, then we 

21
00:00:43,620 --> 00:00:45,240
can see that head is a pointer 

22
00:00:45,240 --> 00:00:47,810
to a branch and that branch is 

23
00:00:47,810 --> 00:00:49,430
just a pointer to the commit 

24
00:00:49,580 --> 00:00:52,280
specified by this hash. If we 

25
00:00:52,280 --> 00:00:54,630
say git reset HEAD, then give it 

26
00:00:54,630 --> 00:00:56,990
a file, it will reset this file 

27
00:00:57,060 --> 00:00:58,580
back to what it was in this 

28
00:00:58,580 --> 00:01:01,000
commit, which means it won''t 

29
00:01:01,000 --> 00:01:04,370
exist. We can do git reset HEAD 

30
00:01:04,710 --> 00:01:07,860
lib.js. Now, if we do a git 

31
00:01:07,860 --> 00:01:09,870
status, we can see that it''s 

32
00:01:09,920 --> 00:01:12,190
untracked. It''s removed from the 

33
00:01:12,190 --> 00:01:13,670
staging area because it doesn''t 

34
00:01:13,670 --> 00:01:16,720
exist in this commit. Now, if 

35
00:01:16,720 --> 00:01:17,590
we want to get rid of it 

36
00:01:17,640 --> 00:01:21,210
entirely, we can remove lib.js. 

37
00:01:22,210 --> 00:01:24,370
If we do a git status, then 

38
00:01:24,370 --> 00:01:26,380
we''re back to normal. We can 

39
00:01:26,380 --> 00:01:29,070
just have our index.html and our 

40
00:01:29,070 --> 00:01:32,580
app.js. The lib.js file is gone.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'We can add another Javascript file to our project with `touch lib.js`. After doing so, we can `git status` to confirm it is untracked. Then, a `git add lib.js` will stage it for a commit. However, we might realize after adding it that we may not want to commit that file at all.

Although Git tells us how to do it in the terminal (`git reset HEAD <file>...`), we want to figure out what the `HEAD` means. With `git log --oneline` we find the `HEAD` is just a pointer to a branch and that branch is just a pointer to the commit specified by a hash on the left.

After running `git reset HEAD lib.js`, we can check if we successfully removed it from being staged for a commit with `git status`.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'f06577f6', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS/dash/scikit-learn-remove-files-from-staging-before-committing-SJbKownnS.mpd', 'https://stream.mux.com/02EJH0254hPcv9FmI00h00FRT96tvIgtCNvpFT9021k300J8Q.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5772, 'Remove Changes from a Commit Before Pushing', NULL, 'If we''ve already committed changes that we _don''t_ want to push, we can also remove those with `git reset`, but we''re going to reset back to a specific commit, either with:

`git reset HEAD~1`

or

`git reset [HASH]`

and that will effectively "undo" the commits before that hash. 

Then we can add and commit only the changes that we want.', 181, NULL, '2019-11-28T06:00:16.379Z', '2025-12-13T00:54:53.678Z', 'git-remove-changes-from-a-commit-before-pushing', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H.jpg', true, NULL, 'Instructor: [00:01] We''re in @.js here and let''s make a function called hello world and that function is just going to alert hello. Then sometime later we close this file and open our index.html file and we''re going to put a description in here. That will say, "Here''s how to fix some common git mistakes."

[00:26] What we want to do is commit just this index to html file, but if we''re careless and we just do a Git Add-A without looking and we commit that, then we have Git Commit-M adds a description to index. Now if we do Git Status, we can see we''re ahead by two commands.

[00:48] We almost PUSH, but before pushing we''re smart and what we want to do is see what we''re about to PUSH. We do a diff on origin master with our current head. What we see is that we have app.js changes that are about to go up, as well as our HTML changes. We realize that we want to get rid of this JavaScript before we push.

[01:11] Let''s take a look at the log with git log, one line. What we want to do is undo this commit because this commit is the one with the mistake in it. To do that, we''re going to use git reset. Git reset takes us back to where we want to reset to. There''s two ways we could specify that.

[01:31] We want to reset back to this commit here. We could say head and then go back one. That''s head ~ 1 and that will go to head and then back on the 301 or we could say git reset and then we could copy this hash exactly so we know what we''re resetting to. Now we have reset and we have unstaged changes.

[01:55] If we do a git status, now it says we have these changes that are not staged for commit. It''s like we didn''t even commit them in the first place. For this reason, you really want to be careful. If we had pushed this commit already and then we reset it, then that means we are changing the history that other people may have already downloaded.

[02:14] We only want to use reset on branches that we haven''t pushed yet. Now, we could git add index.html, which is the only change we want to add and then double check with git status. We have the index to be committed and we are not committing app.js.

[02:33] Now we can commit a description for index. If we do a git status now, we have app.js not staged for a commit. We are two commits ahead of origin/master. We can do git log --oneline now. We''ve gotten rid of that old commit. We are replacing it with this new one.', NULL, true, '04-egghead-git-remove-changes-from-a-commit-before-pushing.mp4', 210, true, false, 401, '---
mp4: 17695185
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H.mp4', 'scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H', 'zduu', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H.mp3?7122715137622d3b?ed0f', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.745Z', NULL, 8388602, NULL, 7239, 0, NULL, 6664192, '81e2b10d424f4aeeaf094196e23e5bc6', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 149826364, '1
00:00:01,040 --> 00:00:04,040
We''re in @.js here and let''s 

2
00:00:04,040 --> 00:00:05,450
make a function called hello 

3
00:00:05,450 --> 00:00:07,600
world and that function is just 

4
00:00:07,600 --> 00:00:10,590
going to alert hello. Then 

5
00:00:10,590 --> 00:00:12,200
sometime later we close this 

6
00:00:12,200 --> 00:00:14,870
file and open our index.html 

7
00:00:14,870 --> 00:00:16,730
file and we''re going to put a 

8
00:00:16,730 --> 00:00:18,680
description in here. That will 

9
00:00:18,680 --> 00:00:21,040
say, "Here''s how to fix some 

10
00:00:21,040 --> 00:00:26,590
common git mistakes." What we 

11
00:00:26,590 --> 00:00:28,730
want to do is commit just this 

12
00:00:28,770 --> 00:00:31,060
index to html file, but if we''re 

13
00:00:31,060 --> 00:00:32,800
careless and we just do a Git 

14
00:00:32,920 --> 00:00:36,080
Add-A without looking and we 

15
00:00:36,080 --> 00:00:38,930
commit that, then we have Git 

16
00:00:38,930 --> 00:00:41,830
Commit-M adds a description to 

17
00:00:41,830 --> 00:00:45,030
index. Now if we do Git Status, 

18
00:00:45,590 --> 00:00:46,910
we can see we''re ahead by two 

19
00:00:46,910 --> 00:00:49,300
commands. We almost PUSH, but 

20
00:00:49,350 --> 00:00:51,370
before pushing we''re smart and 

21
00:00:51,370 --> 00:00:52,530
what we want to do is see what 

22
00:00:52,530 --> 00:00:54,590
we''re about to PUSH. We do a 

23
00:00:54,590 --> 00:00:57,320
diff on origin master with our 

24
00:00:57,320 --> 00:00:59,600
current head. What we see is 

25
00:00:59,600 --> 00:01:01,460
that we have app.js changes that 

26
00:01:01,460 --> 00:01:03,700
are about to go up, as well as 

27
00:01:03,700 --> 00:01:08,000
our HTML changes. We realize 

28
00:01:08,000 --> 00:01:09,450
that we want to get rid of this 

29
00:01:09,450 --> 00:01:10,810
JavaScript before we push. 

30
00:01:11,920 --> 00:01:13,140
Let''s take a look at the log 

31
00:01:13,140 --> 00:01:15,810
with git log, one line. What we 

32
00:01:15,810 --> 00:01:17,880
want to do is undo this commit 

33
00:01:18,720 --> 00:01:19,940
because this commit is the one 

34
00:01:19,940 --> 00:01:22,080
with the mistake in it. To do 

35
00:01:22,080 --> 00:01:23,150
that, we''re going to use git 

36
00:01:23,250 --> 00:01:26,200
reset. Git reset takes us back 

37
00:01:26,200 --> 00:01:28,310
to where we want to reset to. 

38
00:01:29,080 --> 00:01:29,910
There''s two ways we could 

39
00:01:29,910 --> 00:01:32,410
specify that. We want to reset 

40
00:01:32,540 --> 00:01:34,670
back to this commit here. We 

41
00:01:34,670 --> 00:01:37,200
could say head and then go back 

42
00:01:37,320 --> 00:01:40,440
one. That''s head ~ 1 and that 

43
00:01:40,440 --> 00:01:42,300
will go to head and then back on 

44
00:01:42,300 --> 00:01:44,530
the 301 or we could say git 

45
00:01:44,530 --> 00:01:46,250
reset and then we could copy 

46
00:01:46,570 --> 00:01:48,850
this hash exactly so we know 

47
00:01:48,850 --> 00:01:51,560
what we''re resetting to. Now we 

48
00:01:51,560 --> 00:01:53,810
have reset and we have unstaged 

49
00:01:53,840 --> 00:01:56,470
changes. If we do a git status, 

50
00:01:57,490 --> 00:01:58,210
now it says we have these 

51
00:01:58,210 --> 00:01:59,480
changes that are not staged for 

52
00:01:59,480 --> 00:02:01,600
commit. It''s like we didn''t even 

53
00:02:01,600 --> 00:02:02,800
commit them in the first place. 

54
00:02:04,560 --> 00:02:05,710
For this reason, you really want 

55
00:02:05,710 --> 00:02:07,340
to be careful. If we had pushed 

56
00:02:07,340 --> 00:02:09,020
this commit already and then we 

57
00:02:09,020 --> 00:02:10,950
reset it, then that means we are 

58
00:02:10,950 --> 00:02:12,310
changing the history that other 

59
00:02:12,310 --> 00:02:13,300
people may have already 

60
00:02:13,300 --> 00:02:15,600
downloaded. We only want to use 

61
00:02:15,600 --> 00:02:17,300
reset on branches that we 

62
00:02:17,300 --> 00:02:19,890
haven''t pushed yet. Now, we 

63
00:02:19,890 --> 00:02:22,630
could git add index.html, which 

64
00:02:22,630 --> 00:02:23,820
is the only change we want to 

65
00:02:23,820 --> 00:02:25,780
add and then double check with 

66
00:02:25,820 --> 00:02:28,390
git status. We have the index to 

67
00:02:28,390 --> 00:02:30,340
be committed and we are not 

68
00:02:30,390 --> 00:02:34,170
committing app.js. Now we can 

69
00:02:34,170 --> 00:02:37,490
commit a description for index. 

70
00:02:41,360 --> 00:02:43,950
If we do a git status now, we 

71
00:02:43,950 --> 00:02:46,950
have app.js not staged for a 

72
00:02:46,950 --> 00:02:50,250
commit. We are two commits ahead 

73
00:02:50,350 --> 00:02:53,190
of origin/master. We can do git 

74
00:02:53,220 --> 00:02:55,520
log --oneline now. We''ve gotten 

75
00:02:55,520 --> 00:02:57,310
rid of that old commit. We are 

76
00:02:57,310 --> 00:02:58,690
replacing it with this new one.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'Inside of the `app.js` created earlier, we can create a function `helloWorld` that contains `alert("hello!")`. Later, you might close that file and open the `index.html` and make changes to that file like adding a description.

## app.js
```js
// our app js code

function helloWorld() {
  alert("hello!")
}
```

## index.html
```html
<html>
  <head>
    <script type="text/javascript" src="/app.js"></script>
  </head>
  <body>

    <h1>Fixing git mistakes</h1>
    <p>Here''s how to fix some common git mistakes</p>
  </body>
</html>  
```

You may be tempted to use `git add -A` alongside a simple commit message after that, but it will be clear that you are ahead by 2 commits. If you''re able to see this before committing, you want to see what you''re about to push. To check, run `git diff origin/master HEAD` to see the changes to all files edited.

If you realize you want to get rid of something before you push, check the log with `git log --oneline` to see which commit you''d like to undo. You have to decide where you want to reset to, so after finding the desired commit use `git reset {LOCATION}`. The location can be a hash associated with a commit or something like `HEAD~1` which takes you to HEAD, then back down the tree 1 time.

After performing a `git reset`, your files should return to the unstaged location. **It''s important to be careful to not use `git reset` after pushing a commit because it''ll change the history other people may have already downloaded.** So, only use reset on branches that aren''t pushed yet.

Now, you can `git add index.html` and `git commit -m "Adds desc for index"` to fix what went wrong earlier. Using `git status` will us we have the `app.js` not staged for commit and that we are two commits ahead of origin/master. You can use `git log --oneline` to verify the old commit was replaced with the new one.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '44811933', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H/dash/scikit-learn-remove-changes-from-a-commit-before-pushing-Bkn3Z_32H.mpd', 'https://stream.mux.com/RuTKEezGhdS4Il6L4DM7xLx6Ppy3zDpemji6egSyo8k.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5773, 'Use and Compare the Different git Reset Options: --hard, --soft, and --mixed', NULL, '`git reset` has three primary options that we might use: `--soft`, `--hard` and `--mixed` (the default).

We''ll use `git reset` to undo the latest commit in all three ways, and compare the result of reseting with each flag.', 172, NULL, '2019-11-28T06:11:39.365Z', '2025-12-13T00:54:53.678Z', 'git-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr.jpg', true, NULL, 'Instructor: [0:00] If we take a look at git status, we have app.js which is not staged for commit. Let''s open that and let''s add those changes. We can do git add app.js and then git commit app jsChanges. If we do a git log oneline, we have this commit in our local tree. Let''s explore the different ways we could reset this if we wanted to.

[0:26] We can do git --help reset and here''s all the different options. The most common flags you''ll see are soft, hard or mixed, which is the default. Let''s look at each of those. First, we''ll do a git reset --soft and we want to reset to back one from the HEAD. We''ll do HEAD~1 to go back one.

[0:50] Once we do that, we can do a git status. We can see now that we have changes to be committed. What happened is we had changes that were committed and when we get reset --soft, that''s like taking those changes and moving them back into the staging area. Nothing else changed. We just took our commit and moved it into the staging area.

[1:09] If we do a log oneline now, we don''t have that commit anymore because we undid the commit. Let''s redo that commit so we can try again. We''ll do take two. Now if we do a git log oneline, then we have take two is our latest commit.

[1:25] Now let''s git reset --mixed HEAD. We want to go back one again. This is the same as just saying git reset and then going back one, because mixed is the default. Now it says we have unstaged changes. Let''s do a git status.

[1:41] Whereas before we had changes to be committed, these are changes not staged for commit. Mixed takes it back even one step further. It removes the commit, and then it unstages those changes. In app.js, our function is still there. We still have all the code. It just brought it all the way back to our working directory.

[2:01] Let''s add app.js again. We''ll commit it for take three. Now if we do a git log oneline, we have take three. Now we''re about to do a git reset --hard but watch out because you almost never want to do this in real life, and you''ll see why.

[2:22] Let''s do git reset --hard. We want to HEAD~1, so going back one. We can see in our text editor, it got rid of that code. If we do a git status, we have nothing here except for our two commits which we had previously.

[2:39] What happened is, it got rid of the commit, it unstaged the changes, and then also removed them from our working directory. We lost the work that we did. We lost that function. That''s why you usually don''t want to do a git reset --hard.', NULL, true, '05-egghead-git-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed.mp4', 210, true, false, 401, '---
mp4: 20171211
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr.mp4', 'scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr', 'zdus', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr.mp3?c3fc746a5e00bb63?7bca', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.814Z', NULL, 8388602, NULL, 7241, 0, NULL, 7561216, '3412c6e6e3c3439bbd9315566b3ccc60', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 151167076, '1
00:00:00,790 --> 00:00:02,510
If we take a look at git status, 

2
00:00:02,970 --> 00:00:04,830
we have app.js which is not 

3
00:00:04,830 --> 00:00:06,820
staged for commit. Let''s open 

4
00:00:06,820 --> 00:00:09,850
that and let''s add those changes. 

5
00:00:09,850 --> 00:00:12,410
We can do git add app.js and 

6
00:00:12,410 --> 00:00:15,150
then git commit app jsChanges. 

7
00:00:16,680 --> 00:00:19,110
If we do a git log oneline, we 

8
00:00:19,110 --> 00:00:20,490
have this commit in our local 

9
00:00:20,490 --> 00:00:23,030
tree. Let''s explore the 

10
00:00:23,030 --> 00:00:24,360
different ways we could reset 

11
00:00:24,360 --> 00:00:27,200
this if we wanted to. We can do 

12
00:00:27,560 --> 00:00:30,550
git --help reset and here''s all 

13
00:00:30,550 --> 00:00:32,440
the different options. The most 

14
00:00:32,440 --> 00:00:34,260
common flags you''ll see are soft, 

15
00:00:35,060 --> 00:00:37,190
hard or mixed, which is the 

16
00:00:37,190 --> 00:00:39,140
default. Let''s look at each of 

17
00:00:39,140 --> 00:00:41,920
those. First, we''ll do a git 

18
00:00:41,920 --> 00:00:45,170
reset --soft and we want to 

19
00:00:45,170 --> 00:00:47,570
reset to back one from the HEAD. 

20
00:00:47,730 --> 00:00:50,210
We''ll do HEAD~1 to go back one. 

21
00:00:50,620 --> 00:00:51,780
Once we do that, we can do a git 

22
00:00:51,780 --> 00:00:54,090
status. We can see now that we 

23
00:00:54,090 --> 00:00:55,440
have changes to be committed. 

24
00:00:56,380 --> 00:00:58,160
What happened is we had changes 

25
00:00:58,160 --> 00:00:59,770
that were committed and when we 

26
00:00:59,770 --> 00:01:01,710
get reset --soft, that''s like 

27
00:01:02,250 --> 00:01:04,140
taking those changes and moving 

28
00:01:04,140 --> 00:01:05,500
them back into the staging area. 

29
00:01:06,310 --> 00:01:07,410
Nothing else changed. We just 

30
00:01:07,410 --> 00:01:08,440
took our commit and moved it 

31
00:01:08,440 --> 00:01:09,770
into the staging area. If we do 

32
00:01:09,770 --> 00:01:12,160
a log oneline now, we don''t have 

33
00:01:12,160 --> 00:01:13,540
that commit anymore because we 

34
00:01:13,590 --> 00:01:15,900
undid the commit. Let''s redo 

35
00:01:15,900 --> 00:01:17,160
that commit so we can try again. 

36
00:01:17,640 --> 00:01:20,050
We''ll do take two. Now if we do 

37
00:01:20,100 --> 00:01:22,500
a git log oneline, then we have 

38
00:01:22,630 --> 00:01:24,090
take two is our latest commit. 

39
00:01:25,060 --> 00:01:28,080
Now let''s git reset --mixed HEAD. 

40
00:01:28,850 --> 00:01:30,320
We want to go back one again. 

41
00:01:30,930 --> 00:01:32,260
This is the same as just saying 

42
00:01:32,260 --> 00:01:34,000
git reset and then going back 

43
00:01:34,000 --> 00:01:35,120
one, because mixed is the 

44
00:01:35,120 --> 00:01:37,190
default. Now it says we have 

45
00:01:37,290 --> 00:01:39,330
unstaged changes. Let''s do a git 

46
00:01:39,330 --> 00:01:42,660
status. Whereas before we had 

47
00:01:42,850 --> 00:01:44,750
changes to be committed, these 

48
00:01:44,790 --> 00:01:46,300
are changes not staged for 

49
00:01:46,300 --> 00:01:48,860
commit. Mixed takes it back even 

50
00:01:48,860 --> 00:01:50,820
one step further. It removes the 

51
00:01:50,820 --> 00:01:52,890
commit, and then it unstages 

52
00:01:52,890 --> 00:01:56,050
those changes. In app.js, our 

53
00:01:56,050 --> 00:01:57,660
function is still there. We 

54
00:01:57,660 --> 00:01:59,240
still have all the code. It just 

55
00:01:59,240 --> 00:02:00,100
brought it all the way back to 

56
00:02:00,100 --> 00:02:02,150
our working directory. Let''s 

57
00:02:02,570 --> 00:02:05,170
add app.js again. We''ll commit 

58
00:02:05,170 --> 00:02:10,940
it for take three. Now if we do 

59
00:02:10,940 --> 00:02:12,940
a git log oneline, we have take 

60
00:02:12,940 --> 00:02:15,810
three. Now we''re about to do a 

61
00:02:15,810 --> 00:02:18,010
git reset --hard but watch out 

62
00:02:18,060 --> 00:02:19,410
because you almost never want to 

63
00:02:19,410 --> 00:02:20,900
do this in real life, and you''ll 

64
00:02:20,900 --> 00:02:23,160
see why. Let''s do git reset --

65
00:02:23,340 --> 00:02:26,480
hard. We want to HEAD~1, so 

66
00:02:26,480 --> 00:02:30,430
going back one. We can see in 

67
00:02:30,430 --> 00:02:31,760
our text editor, it got rid of 

68
00:02:31,760 --> 00:02:34,410
that code. If we do a git status, 

69
00:02:34,940 --> 00:02:37,190
we have nothing here except for 

70
00:02:37,190 --> 00:02:38,250
our two commits which we had 

71
00:02:38,250 --> 00:02:40,330
previously. What happened is, 

72
00:02:40,330 --> 00:02:41,860
it got rid of the commit, it 

73
00:02:41,940 --> 00:02:43,650
unstaged the changes, and then 

74
00:02:43,650 --> 00:02:44,900
also removed them from our 

75
00:02:44,900 --> 00:02:47,150
working directory. We lost the 

76
00:02:47,180 --> 00:02:48,620
work that we did. We lost that 

77
00:02:48,620 --> 00:02:50,460
function. That''s why you usually 

78
00:02:50,460 --> 00:02:51,630
don''t want to do a git reset --

79
00:02:51,705 --> 00:02:52,030
hard.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'If our `app.js` is modified and we run the commands

```
git add app.js
git commit -m "app js changes"
git log --oneline
```

it will commit the file locally and we can see the commit in your tree.

**Running `git --help reset` will show the different reset options.**

The common flags you will see are `--soft`, `--hard`, and `--mixed`. If you try `git reset --soft HEAD~1` to reset back one from the HEAD, it will take the previously committed `app.js` and move it back to the staging area.

We can redo this with `git commit -m "take 2"` and try a reset with `git reset --mixed HEAD~1`, the `app.js` removes the commit as well as unstages the changes.

Trying another reset, we can run `git add app.js` and `git commit -m "take 3"` to prepare our file. We can enter `git reset --hard HEAD~1`, but see that it actually causes us to lose our work. It gets rid of the commit, unstages the changes, and removes them from our directory. **Because we lose our work doing so, you don''t usually want to do a `git reset --hard`.**

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '1849e1b7', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr/dash/scikit-learn-use-and-compare-the-different-git-reset-options-hard-soft-and-mixed-S1doVu2nr.mpd', 'https://stream.mux.com/K9jNygf00rrcBobB9AHA4FvSu00AYdSAgwONsu9yHrdhM.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5774, 'Recover Local Changes from `git reset --hard` with `git reflog`', NULL, 'If you''ve removed a commit with `git reset --hard`, it''s still possible to recover the commit using `git reflog` to look up the commit hash.

Once we find the right commit hash, we can reset our branch _back_ to that commit hash with `git reset --hard [HASH]`

NOTE!  git will actually garbage collect abandoned commits (every 30 days or so - so not very often) - so you can''t recover from a `reset --hard` forever; which is why it''s recommended to avoid `--hard` if you ever want to references those changes.', 88, NULL, '2019-11-28T06:29:41.276Z', '2025-12-13T00:54:53.678Z', 'git-recover-local-changes-from-git-reset-hard-with-git-reflog', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH.jpg', true, NULL, 'Instructor: [0:00] We just did a git reset --hard back one which removed our function from app.js. We really want to get that function back so let''s take a look at how we might do that. For that, we''re going to use git rough log which is a really powerful way to look at all the different things you''ve done in your local Git repository.

[0:21] For example, you can see the three latest resets that we''ve done and this last one was the reset hard. Now, we want to recover this commit here, this take three commit, but one thing to note is that this commit, because we reset hard, is now abandoned and will actually get garbage collected eventually if we don''t save it.

[0:40] Rough log will work to save commits but only if they haven''t been garbage collected by Git yet. We want to reset master to this commit to recover it so we can take the hash and we can git reset --hard back to that hash. Now we have our function back in app. If we do a git log oneline, we can see that we have our regular commits, and then we have the take three commit back on as master.

[1:10] We used reset --hard both to get rid of this commit by resetting to this commit, but also to recover it again from the ref log. Let''s push this up to GitHub before we make any more mistakes. This is up in GitHub, so we can check it out there, as well.', NULL, true, '06-egghead-git-recover-local-changes-from-git-reset-hard-with-git-reflog.mp4', 210, true, false, 401, '---
mp4: 10640748
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH.mp4', 'scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH', 'zduR', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH.mp3?d60cfb7c23b7d75d?4595', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.654Z', NULL, 8388602, NULL, 7242, 0, NULL, 7892992, 'f0ada1a9d9ee4762b677e491d7bf6e42', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 151837432, '1
00:00:00,630 --> 00:00:02,610
We just did a git reset --hard 

2
00:00:02,960 --> 00:00:04,980
back one which removed our 

3
00:00:04,980 --> 00:00:07,820
function from app.js. We really 

4
00:00:07,820 --> 00:00:08,840
want to get that function back 

5
00:00:09,350 --> 00:00:10,640
so let''s take a look at how we 

6
00:00:10,640 --> 00:00:12,670
might do that. For that, we''re 

7
00:00:12,670 --> 00:00:16,240
going to use git rough log which 

8
00:00:16,240 --> 00:00:17,740
is a really powerful way to look 

9
00:00:17,740 --> 00:00:18,790
at all the different things 

10
00:00:18,790 --> 00:00:19,880
you''ve done in your local Git 

11
00:00:19,880 --> 00:00:21,840
repository. For example, you 

12
00:00:21,840 --> 00:00:24,130
can see the three latest resets 

13
00:00:24,130 --> 00:00:25,450
that we''ve done and this last 

14
00:00:25,490 --> 00:00:28,320
one was the reset hard. Now, we 

15
00:00:28,320 --> 00:00:30,830
want to recover this commit here, 

16
00:00:30,850 --> 00:00:32,750
this take three commit, but one 

17
00:00:32,750 --> 00:00:33,610
thing to note is that this 

18
00:00:33,610 --> 00:00:35,170
commit, because we reset hard, 

19
00:00:35,580 --> 00:00:36,980
is now abandoned and will 

20
00:00:36,980 --> 00:00:38,180
actually get garbage collected 

21
00:00:38,180 --> 00:00:39,830
eventually if we don''t save it. 

22
00:00:40,130 --> 00:00:41,320
Rough log will work to save 

23
00:00:41,320 --> 00:00:42,700
commits but only if they haven''t 

24
00:00:42,700 --> 00:00:44,030
been garbage collected by Git 

25
00:00:45,350 --> 00:00:48,020
yet. We want to reset master to 

26
00:00:48,020 --> 00:00:49,930
this commit to recover it so we 

27
00:00:49,930 --> 00:00:52,560
can take the hash and we can git 

28
00:00:52,750 --> 00:00:56,220
reset --hard back to that hash. 

29
00:00:57,660 --> 00:00:59,980
Now we have our function back in 

30
00:00:59,980 --> 00:01:02,410
app. If we do a git log oneline, 

31
00:01:03,750 --> 00:01:05,020
we can see that we have our 

32
00:01:05,020 --> 00:01:06,190
regular commits, and then we 

33
00:01:06,190 --> 00:01:07,620
have the take three commit back 

34
00:01:07,690 --> 00:01:10,620
on as master. We used reset --

35
00:01:10,620 --> 00:01:11,990
hard both to get rid of this 

36
00:01:11,990 --> 00:01:13,670
commit by resetting to this 

37
00:01:13,670 --> 00:01:15,240
commit, but also to recover it 

38
00:01:15,240 --> 00:01:18,610
again from the ref log. Let''s 

39
00:01:18,910 --> 00:01:20,430
push this up to GitHub before we 

40
00:01:20,430 --> 00:01:25,000
make any more mistakes. This is 

41
00:01:25,000 --> 00:01:26,350
up in GitHub, so we can check it 

42
00:01:26,350 --> 00:01:27,160
out there, as well.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'After doing a `git reset --hard HEAD~1`, it removed the code in our `app.js`, but we want to get it back. We can look at `git reflog`, something used to look at all the different things you have done in your local git repository. You can see the latest resets you''ve done with that command, note the hashes which you''ll be using later.

One thing to note is that we are trying to recover a hard reset, so the commit is considered abandoned and will get garbage collected eventually if we don''t save it. **`git reflog` will work to save commits, but only if they haven''t been garbage collected by git yet.**

Once you find the commit you need to return to to recover your code, use that hash and run `git reset --hard {HASH}`. It will then return your code back to its state. Using `git log --oneline` shows the regular commits, as well the old commit. After successfully recovering, remember to `git push` to store in Github to view.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '11e22f56', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH/dash/scikit-learn-recover-local-changes-from-git-reset-hard-with-git-reflog-BkbJtu2hH.mpd', 'https://stream.mux.com/eNWwU7026jeRnuavR6DEVsdDCZB2ZLWWhpPNTIW1Hbvk.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5776, 'Undo a Commit that has Already Been Pushed', NULL, 'Once a commit is pushed, you do NOT want to use `git reset` to undo it - because `reset` will rewrite the history tree, and anyone who has already pulled that branch will have a bad tree.

Instead, we''ll use `git revert` to make a "revert commit" (like a merge commit), which will "undo" a specific commit.  So the syntax is:

`git revert [HASH-TO-UNDO]`
', 103, NULL, '2019-11-28T06:36:25.110Z', '2025-12-13T00:54:53.678Z', 'git-undo-a-commit-that-has-already-been-pushed', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r.jpg', true, NULL, 'Instructor: [00:00] In our project, we''ve just made a push to GitHub. If we do a git log oneline, we see that our HEAD is pointing to our local branch master, which is also where our origin master and origin HEAD are, which means our local branch is up to date with our origin.

[00:16] Say we have this take three commit here where we edit this function and we want to change something about that. We will not use git reset here though, because we''ve already pushed this and someone else may have pulled it. If we reset, that means we''re re-writing history and we don''t want to do that once it''s already pushed.

[00:33] Instead, we are going to do a git revert. We can do a git revert. Here we want to give it the hash of the commit that we want to revert. That''s this one right here. Let''s revert this hash, and it brings up a text editor here and it wants us to make a revert commit.

[00:50] This is like a merge commit, meaning it adds another commit to the tree, and we have to give it a message. Revert take three, that''s a fine message. I''m going to hit <esc> :wq to save that.

[01:02] Now, if I do a git log oneline, we can see that it has reverted take three. If I check out app.js, that function is gone. What happened is, between here and here, I added the function. The revert of that is to remove the function.

[01:20] The really important thing here is that the history is still there. If we went back to this take three commit, we would get our function back. Crucially, anyone who''s already pulled the origin/master branch will have a clean history tree because we used revert here instead of reset.

[01:36] We can git push this, and now all of our collaborators will have this file empty, as well.', NULL, true, '07-egghead-git-undo-a-commit-that-has-already-been-pushed.mp4', 210, true, false, 401, '---
mp4: 8752461
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r.mp4', 'scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r', 'zduq', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r.mp3?b04883ccd09cf69c?57c5', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.840Z', NULL, 8388602, NULL, 7243, 0, NULL, 8175616, '3cbf577cde9641e880c73c43ed41bc42', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 153178144, '1
00:00:00,550 --> 00:00:01,790
In our project, we''ve just made 

2
00:00:01,790 --> 00:00:03,440
a push to GitHub. If we do a git 

3
00:00:03,440 --> 00:00:06,180
log oneline, we see that our 

4
00:00:06,420 --> 00:00:07,710
HEAD is pointing to our local 

5
00:00:07,710 --> 00:00:09,620
branch master, which is also 

6
00:00:09,620 --> 00:00:11,330
where our origin master and 

7
00:00:11,330 --> 00:00:13,690
origin HEAD are, which means our 

8
00:00:13,690 --> 00:00:15,160
local branch is up to date with 

9
00:00:15,160 --> 00:00:17,370
our origin. Say we have this 

10
00:00:17,570 --> 00:00:19,560
take three commit here where we 

11
00:00:19,770 --> 00:00:21,350
edit this function and we want 

12
00:00:21,350 --> 00:00:22,570
to change something about that. 

13
00:00:23,070 --> 00:00:24,630
We will not use git reset here 

14
00:00:24,630 --> 00:00:25,710
though, because we''ve already 

15
00:00:25,710 --> 00:00:26,970
pushed this and someone else may 

16
00:00:26,970 --> 00:00:28,670
have pulled it. If we reset, 

17
00:00:28,670 --> 00:00:29,720
that means we''re re-writing 

18
00:00:29,720 --> 00:00:31,230
history and we don''t want to do 

19
00:00:31,230 --> 00:00:32,410
that once it''s already pushed. 

20
00:00:33,230 --> 00:00:34,380
Instead, we are going to do a 

21
00:00:34,380 --> 00:00:36,390
git revert. We can do a git 

22
00:00:36,420 --> 00:00:38,330
revert. Here we want to give it 

23
00:00:38,330 --> 00:00:40,060
the hash of the commit that we 

24
00:00:40,060 --> 00:00:42,300
want to revert. That''s this one 

25
00:00:42,300 --> 00:00:44,670
right here. Let''s revert this 

26
00:00:44,670 --> 00:00:46,960
hash, and it brings up a text 

27
00:00:46,960 --> 00:00:48,690
editor here and it wants us to 

28
00:00:48,690 --> 00:00:50,520
make a revert commit. This is 

29
00:00:50,520 --> 00:00:52,630
like a merge commit, meaning it 

30
00:00:52,630 --> 00:00:54,270
adds another commit to the tree, 

31
00:00:54,720 --> 00:00:55,990
and we have to give it a message. 

32
00:00:56,640 --> 00:00:58,260
Revert take three, that''s a fine 

33
00:00:58,260 --> 00:01:00,430
message. I''m going to hit <esc> :

34
00:01:00,780 --> 00:01:03,450
wq to save that. Now, if I do a 

35
00:01:03,450 --> 00:01:06,780
git log oneline, we can see that 

36
00:01:06,820 --> 00:01:09,360
it has reverted take three. If I 

37
00:01:09,360 --> 00:01:11,530
check out app.js, that function 

38
00:01:11,530 --> 00:01:13,930
is gone. What happened is, 

39
00:01:14,530 --> 00:01:15,990
between here and here, I added 

40
00:01:15,990 --> 00:01:18,780
the function. The revert of that 

41
00:01:18,780 --> 00:01:21,030
is to remove the function. The 

42
00:01:21,030 --> 00:01:22,330
really important thing here is 

43
00:01:22,330 --> 00:01:23,910
that the history is still there. 

44
00:01:24,310 --> 00:01:26,020
If we went back to this take 

45
00:01:26,020 --> 00:01:27,050
three commit, we would get our 

46
00:01:27,050 --> 00:01:29,370
function back. Crucially, anyone 

47
00:01:29,370 --> 00:01:30,640
who''s already pulled the origin/

48
00:01:30,640 --> 00:01:32,520
master branch will have a clean 

49
00:01:32,520 --> 00:01:33,930
history tree because we used 

50
00:01:33,980 --> 00:01:35,390
revert here instead of reset. 

51
00:01:36,670 --> 00:01:39,310
We can git push this, and now 

52
00:01:39,310 --> 00:01:40,470
all of our collaborators will 

53
00:01:40,470 --> 00:01:42,190
have this file empty, as well.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'If we just made a push to Github, we can use `git log --oneline` to see our local branch is up to date with our origin. We are presented with a problem when we try to undo a commit that''s already been pushed. **We have to be careful because if we undo a commit already pushed, we would affect those who pulled the changes, effectively rewriting history.**

We are going to use `git revert {HASH}` with the hash being the commit we want to revert. After doing so, it''ll want you to make a revert commit. It''s similar to a merge commit because it adds another commit to the tree, plus we have to give it a message. After entering the message, running `git log --oneline` we find that it successfully reverted the last commit.

**The important thing is that when using `git revert`, the history is still there.** You can go back to an earlier commit to revive previous work/code. In addition, anyone who pulled the origin/master branch during the time it took to revert will have a clean history tree because we used `git revert {HASH}` instead of `git reset --hard {HASH}`.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '52b14e84', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r/dash/scikit-learn-undo-a-commit-that-has-already-been-pushed-S1Lu9dn3r.mpd', 'https://stream.mux.com/kjiEt02qtV4Z8xPWY4yi7BTKMWAMAwMT4xUcaizVu5Ok.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5779, 'Copy a Commit from One Branch to Another', NULL, 'If you want to pull over just a single commit from one branch onto another, you can do that with `git cherry-pick [HASH-TO-MOVE]`

We''ll demonstrate that by making a commit on a feature branch, and then copying that commit (but not the entire branch) onto master.', 83, NULL, '2019-11-28T07:49:35.721Z', '2025-12-13T00:54:53.678Z', 'git-copy-a-commit-from-one-branch-to-another', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH.jpg', true, NULL, 'Instructor: [00:00] If we do git branch, we see we have two different branches here. If we do git log one line, we can see that our latest branch has adsHelloWorld as the commit, and that is diverse from master, which is the reversion of the take three commit.

[00:17] This is our app.js on the JSChanges branch. Let''s check out master. Now our app.js is empty. Let''s say we''re on master and we really want that function on master, but we don''t want to pull over the entire JSChanges branch yet. What we really want is just to pick this commit and move it over to master.

[00:38] If we do a git log one line now, we see that the latest is revert take three, and we want this adsHelloWorld. We''re going to get the hash of the commit that we want, and we''re going to do git cherry-pick, and then we''re going to do the hash that we want.

[00:56] If we do a git log one line, we can see that our head is pointing at adsHelloWorld, but the hash is different. It''s made a new commit hash as it came over and we have our function here.

[01:11] If we are happy with what we have now, we can do a git push. Now, we''ve copied the commit from js.changes over the master and pushed it up. The commit now exists in both trees.', NULL, true, '09-egghead-git-copy-a-commit-from-one-branch-to-another.mp4', 210, true, false, 401, '---
mp4: 8752276
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH.mp4', 'scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH', 'zduV', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH.mp3?0aa62cd2bcbd3e02?3d49', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.201Z', NULL, 8388602, NULL, 7247, 0, NULL, 8306688, '425787dd49634422a7110b3aa40ccba7', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 155189212, '1
00:00:00,950 --> 00:00:02,810
If we do git branch, we see we 

2
00:00:02,810 --> 00:00:03,910
have two different branches here. 

3
00:00:04,500 --> 00:00:07,420
If we do git log one line, we 

4
00:00:07,420 --> 00:00:09,430
can see that our latest branch 

5
00:00:09,520 --> 00:00:11,750
has adsHelloWorld as the commit, 

6
00:00:12,370 --> 00:00:13,910
and that is diverse from master, 

7
00:00:13,950 --> 00:00:15,840
which is the reversion of the 

8
00:00:15,840 --> 00:00:18,020
take three commit. This is our 

9
00:00:18,060 --> 00:00:20,520
app.js on the JSChanges branch. 

10
00:00:20,730 --> 00:00:25,070
Let''s check out master. Now our 

11
00:00:25,070 --> 00:00:27,470
app.js is empty. Let''s say we''re 

12
00:00:27,470 --> 00:00:29,060
on master and we really want 

13
00:00:29,060 --> 00:00:31,050
that function on master, but we 

14
00:00:31,050 --> 00:00:32,090
don''t want to pull over the 

15
00:00:32,090 --> 00:00:33,940
entire JSChanges branch yet. 

16
00:00:34,450 --> 00:00:35,370
What we really want is just to 

17
00:00:35,370 --> 00:00:37,320
pick this commit and move it 

18
00:00:37,360 --> 00:00:39,430
over to master. If we do a git 

19
00:00:39,430 --> 00:00:42,790
log one line now, we see that 

20
00:00:43,120 --> 00:00:44,980
the latest is revert take three, 

21
00:00:45,230 --> 00:00:46,920
and we want this adsHelloWorld. 

22
00:00:47,270 --> 00:00:48,730
We''re going to get the hash of 

23
00:00:48,730 --> 00:00:50,460
the commit that we want, and 

24
00:00:50,460 --> 00:00:52,440
we''re going to do git cherry-

25
00:00:52,440 --> 00:00:54,460
pick, and then we''re going to do 

26
00:00:54,590 --> 00:00:57,480
the hash that we want. If we do 

27
00:00:57,480 --> 00:01:00,770
a git log one line, we can see 

28
00:01:00,770 --> 00:01:03,070
that our head is pointing at 

29
00:01:03,140 --> 00:01:05,660
adsHelloWorld, but the hash is 

30
00:01:05,660 --> 00:01:07,260
different. It''s made a new 

31
00:01:07,260 --> 00:01:08,970
commit hash as it came over and 

32
00:01:08,970 --> 00:01:11,680
we have our function here. If 

33
00:01:11,680 --> 00:01:12,750
we are happy with what we have 

34
00:01:12,750 --> 00:01:16,340
now, we can do a git push. Now, 

35
00:01:16,340 --> 00:01:18,370
we''ve copied the commit from js.

36
00:01:18,370 --> 00:01:19,860
changes over the master and 

37
00:01:19,860 --> 00:01:21,370
pushed it up. The commit now 

38
00:01:21,370 --> 00:01:22,510
exists in both trees.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'If we do `git branch`, we notice we have two branches. In addition, `git log --oneline` shows us our latest branch has our commit diverging from `master`, the reversion of the `take 3` commit. We can switch over to `master` with `git checkout master` leaving our `app.js` empty.

A problem we could face is that we want the function we created on our separate branch `js-changes` transferred/copied to `master` without pulling the entire branch. We simply want to pick the individual commit to `js-changes` and move it to `master`.

`git log --oneline` shows us our current latest commit in `master` isn''t up to date with the separate branch. **What we can do to match the commit in our branches is use cherry picking. We run `git cherry-pick {HASH}` with the hash being the desired commit.** Now, our `git log --oneline` actually shows there was a new commit hash created as it came over. **What happened is we copied the commit from `js-changes` over to `master` and pushed it up, so the commit exists in both trees.**

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'de0f919c', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH/dash/scikit-learn-copy-a-commit-from-one-branch-to-another-r1n9sK2nH.mpd', 'https://stream.mux.com/XWCfZwj8iW9PZU46YjfeH7Ah3k1aP2aQ2VaxEOXiZ78.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5780, 'Move a Commit that was Committed on the Wrong Branch', NULL, 'We''ll do some work and commit it - but then realize it was on the wrong branch!

To move a commit from one branch to another, we''ll first `git cherry-pick` the commit we want, and then use `git reset` to remove the commit from the master branch.  

Then we''ll be able to manually delete the changes that we don''t want on the master branch.', 165, NULL, '2019-11-28T07:59:37.982Z', '2025-12-13T00:54:53.678Z', 'git-move-a-commit-that-was-committed-on-the-wrong-branch', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr.jpg', true, NULL, 'Instructor: [00:00] We have two branches here and we are currently on our master branch. Let''s write a function like second function. That''s just going to alert this is number two. Save that. If we do a git status, we have modified app JS, so let''s add that and commit that as my second function.

[00:24] Before pushing, we do a git branch and realize we made this change on the master branch and we meant to do it on the JS changes branch. If we do a git log --oneline now, we can see that we want to move this commit from master over to JS changes. The problem is master is pointing here. We have to be able to move master back here as well.

[00:46] There are several ways we can do this. Many of them involve a git reset hard at some point. Beware of those because if you do reset hard incorrectly, you can lose data. We''re going to use git reset, but not a git reset hard.

[01:00] Let''s look at our branches again. We''re going to switch to the JS changes branch, so git checkout JS changes. What we want to do to get this function into it is copy this commit hash. We''re going to cherry pick that commit hash. We''re going to cherry pick the commit hash that we want to move over.

[01:19] Now, on the JS changes branch, we have the code we want so we can push that. Now JS changes is correct. Let''s switch back to master.

[01:33] If we look at master, we still have the code here. If we do a log one line, we still have that commit because cherry pick just copies over the commit. It doesn''t remove it from the other branch. What we want to do is switch master to be back at this commit.

[01:50] We''re going to do a git reset here, but not a reset hard, back to this commit hash. We could do that commit hash or we could go to the head and go back one. We''ll do that. Now if we do a git status, we have app.js, which is still modified. This is because we didn''t do a reset hard.

[02:11] Now what we can do, since we don''t want this function in here, is we can manually do this remediation, which is git checkout app.js. That will reset app.js to whatever it is at the hash that we reset to.

[02:27] If we do a git status now, app.js is not changed. If we do a git log --oneline, that commit is gone. This is like manually doing a reset hard, but I like this better because we get to choose exactly what files we get to reset.', NULL, true, '10-egghead-git-move-a-commit-that-was-committed-on-the-wrong-branch.mp4', 210, true, false, 401, '---
mp4: 18462492
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr.mp4', 'scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr', 'zduo', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr.mp3?67d8f1c9e041535b?46cc', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.110Z', NULL, 8388602, NULL, 7248, 0, NULL, 8369408, '54ad6cad636d4bb48e87f390be6b561f', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 155859568, '1
00:00:00,480 --> 00:00:02,150
We have two branches here and we 

2
00:00:02,150 --> 00:00:03,370
are currently on our master 

3
00:00:03,370 --> 00:00:05,540
branch. Let''s write a function 

4
00:00:05,700 --> 00:00:08,290
like second function. That''s 

5
00:00:08,290 --> 00:00:10,170
just going to alert this is 

6
00:00:10,770 --> 00:00:14,100
number two. Save that. If we do 

7
00:00:14,130 --> 00:00:16,270
a git status, we have modified 

8
00:00:16,270 --> 00:00:19,480
app JS, so let''s add that and 

9
00:00:19,480 --> 00:00:22,160
commit that as my second 

10
00:00:22,210 --> 00:00:25,850
function. Before pushing, we do 

11
00:00:25,850 --> 00:00:27,610
a git branch and realize we made 

12
00:00:27,610 --> 00:00:28,960
this change on the master branch 

13
00:00:29,110 --> 00:00:30,610
and we meant to do it on the JS 

14
00:00:30,610 --> 00:00:33,020
changes branch. If we do a git 

15
00:00:33,050 --> 00:00:35,620
log --oneline now, we can see 

16
00:00:35,620 --> 00:00:37,080
that we want to move this commit 

17
00:00:37,610 --> 00:00:40,010
from master over to JS changes. 

18
00:00:40,400 --> 00:00:41,500
The problem is master is 

19
00:00:41,680 --> 00:00:43,080
pointing here. We have to be 

20
00:00:43,080 --> 00:00:45,080
able to move master back here as 

21
00:00:45,080 --> 00:00:47,010
well. There are several ways we 

22
00:00:47,010 --> 00:00:48,420
can do this. Many of them 

23
00:00:48,500 --> 00:00:50,340
involve a git reset hard at some 

24
00:00:50,340 --> 00:00:52,200
point. Beware of those because 

25
00:00:52,200 --> 00:00:54,060
if you do reset hard incorrectly, 

26
00:00:54,190 --> 00:00:56,250
you can lose data. We''re going 

27
00:00:56,250 --> 00:00:58,380
to use git reset, but not a git 

28
00:00:58,380 --> 00:01:00,850
reset hard. Let''s look at our 

29
00:01:00,850 --> 00:01:02,860
branches again. We''re going to 

30
00:01:02,920 --> 00:01:04,510
switch to the JS changes branch, 

31
00:01:04,610 --> 00:01:08,570
so git checkout JS changes. What 

32
00:01:08,570 --> 00:01:09,580
we want to do to get this 

33
00:01:09,580 --> 00:01:11,520
function into it is copy this 

34
00:01:11,520 --> 00:01:13,150
commit hash. We''re going to 

35
00:01:13,150 --> 00:01:14,640
cherry pick that commit hash. 

36
00:01:15,030 --> 00:01:16,650
We''re going to cherry pick the 

37
00:01:16,650 --> 00:01:18,200
commit hash that we want to move 

38
00:01:18,200 --> 00:01:20,790
over. Now, on the JS changes 

39
00:01:20,790 --> 00:01:22,400
branch, we have the code we want 

40
00:01:23,010 --> 00:01:28,510
so we can push that. Now JS 

41
00:01:28,510 --> 00:01:30,790
changes is correct. Let''s switch 

42
00:01:30,790 --> 00:01:34,120
back to master. If we look at 

43
00:01:34,120 --> 00:01:35,310
master, we still have the code 

44
00:01:35,310 --> 00:01:37,360
here. If we do a log one line, 

45
00:01:38,170 --> 00:01:39,320
we still have that commit 

46
00:01:39,940 --> 00:01:41,920
because cherry pick just copies 

47
00:01:41,980 --> 00:01:42,950
over the commit. It doesn''t 

48
00:01:43,090 --> 00:01:44,380
remove it from the other branch. 

49
00:01:44,960 --> 00:01:46,960
What we want to do is switch 

50
00:01:46,960 --> 00:01:49,500
master to be back at this commit. 

51
00:01:50,190 --> 00:01:51,380
We''re going to do a git reset 

52
00:01:51,380 --> 00:01:53,500
here, but not a reset hard, back 

53
00:01:53,500 --> 00:01:56,340
to this commit hash. We could do 

54
00:01:56,340 --> 00:01:58,460
that commit hash or we could go 

55
00:01:58,460 --> 00:02:00,630
to the head and go back one. 

56
00:02:01,740 --> 00:02:03,320
We''ll do that. Now if we do a 

57
00:02:03,320 --> 00:02:06,710
git status, we have app.js, 

58
00:02:06,710 --> 00:02:08,630
which is still modified. This is 

59
00:02:08,630 --> 00:02:09,890
because we didn''t do a reset 

60
00:02:09,890 --> 00:02:12,150
hard. Now what we can do, since 

61
00:02:12,150 --> 00:02:13,390
we don''t want this function in 

62
00:02:13,390 --> 00:02:15,550
here, is we can manually do this 

63
00:02:15,550 --> 00:02:16,680
remediation, which is git 

64
00:02:16,840 --> 00:02:20,230
checkout app.js. That will reset 

65
00:02:20,320 --> 00:02:22,970
app.js to whatever it is at the 

66
00:02:22,970 --> 00:02:27,720
hash that we reset to. If we do 

67
00:02:27,720 --> 00:02:31,200
a git status now, app.js is not 

68
00:02:31,200 --> 00:02:32,780
changed. If we do a git log --

69
00:02:33,000 --> 00:02:35,420
oneline, that commit is gone. 

70
00:02:35,950 --> 00:02:37,880
This is like manually doing a 

71
00:02:37,880 --> 00:02:39,380
reset hard, but I like this 

72
00:02:39,380 --> 00:02:40,880
better because we get to choose 

73
00:02:40,880 --> 00:02:42,340
exactly what files we get to 

74
00:02:42,415 --> 00:02:42,740
reset.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'Using `git branch` shows us we have two branches, `js-changes` and `master`, and we are on `master`. We can write a second function in our `app.js`.

## app.js
```js
// our app js code

function helloWorld() {
  alert("Hi!")
}

function secondFunction() {
  alert("This is number 2")
}
```

After modifying, we add and commit it.

## Terminal Input
```
git add -A
git commit -m "My second function"
```

However, after doing so, doing `git branch` shows us we made this commit on `master` branch and we meant to do it on the `js-changes` branch. `git log --oneline` shows us which commit we need to move from `master` to `js-changes`, but the problem is master is pointing to it. **A lot of solutions to this involve `git reset --hard`, but beware because they can cause a loss of data.**

What we want to do is switch to the `js-changes` branch with `git checkout js-changes`. Now, to get the function into it, we copy the commit hash and cherry pick that commit hash we want to move over with `git cherry-pick {HASH}`. Now, on the `js-changes` branch, we have the code we want and can push that with `git push`.

At this moment, our code on `js-changes` is correct, but `master` still contains that old commit, as **cherry picking copies the commit but doesn''t remove it**. To switch `master` to be back at a previous commit, we do a `git reset {HASH}` to the commit we want to return to. An alternative to returning the hash would be making the it `HEAD~1`.

Now, `git status` shows `app.js` is still a modified file. **However, after resetting we can `git checkout app.js` to reset it whatever it was at the hash we reset to.** After entering that, `git status` shows `app.js` is not changed and `git log --oneline` shows the commit is gone. This approach is like manually doing a reset hard, but we can choose exactly what files we want to reset making it a safe and powerful option.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'e6cda6ed', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr/dash/scikit-learn-move-a-commit-that-was-committed-on-the-wrong-branch-BkLx0K3hr.mpd', 'https://stream.mux.com/9MQDXopKwZrLO5IU4gezWwyFijeg63ZPQBPcSxGh01xA.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5781, 'Use `git stash` to Save Local Changes While Pulling', NULL, 'If we make a change to the same function both locally and remotely, then when we try to pull down the remote changes, we''ll run into a conflict - and git won''t pull the remote changes down.

So first, we''ll use `git stash` to stash the local changes, and then `git pull` to get the remote changes.  To apply the stashed changed, we''ll then use `git stash pop`

Since we changed the same function however, we''ll get a merge conflict!  So we''ll fix the merge conflict, and then add and commit that change.

Finally, we''ll drop the change from the stash with: `git stash drop stash@{0}`', 213, NULL, '2019-11-28T08:45:59.428Z', '2025-12-13T00:54:53.678Z', 'git-use-git-stash-to-save-local-changes-while-pulling', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r.jpg', true, NULL, 'Instructor: [00:00] We are in a feature branch here called JS changes. I want to change my "Hello, world" function to say, "Alert. Hi from local." I will save that. Now if I do a git status, I have unstaged changes.

[00:16] What happens if someone else changes that file? If we go over to GitHub here and go to our JS changes branch, we can check out the app.js file. This is the last version that was pushed. We can actually edit it right here on GitHub.

[00:32] Here I can say, "Alert. Hi from GitHub." Down here, I can commit that change. I can say, "Hi from GitHub change." I will commit directly to the JS changes branch. Now our app.js on GitHub says "Hi from GitHub."

[00:55] Let''s go back to our code here, then, and try a git pull. What we get is that our local changes will be overwritten by the merge. We have to do something to prevent our local changes from being overwritten for now. It says here our two options are to stash them or commit them. We''re going to show how to stash them here.

[01:15] If we do git stash, then it will take the code we just wrote and put it in a special stash. If we do git status, we can see we have no changes right here. If we do a git stash list, we can see our change was added over to the stash at zero.

[01:34] Now we can do a git pull. Here is our "Hello from GitHub" that we added. Now we have to git our stashed changes back. We can always do git --help stash to see how to get it back. The two ways we might do that are pop and apply.

[01:51] Pop and apply are similar, but pop will remove the change from the stash and applies the change from the stash but keeps it in the stash as well, in case you want to use it later. We''re going to git stash pop. Here, we have another problem, which is a merge conflict.

[02:08] What happened is like we committed this into the stash. Now when we''re popping it off, we get the same thing that we would if we committed it, which is a merge conflict. We have to fix it.

[02:18] The way to fix merge conflicts is just to manually go in and do it. You have to figure out what code you want to keep and what code you want to get rid of. In this case, we want both. We are going to remove the merge conflict lines. Now we have both lines, "Alert from GitHub" and "Alert from local." We can save that.

[02:37] If we do a git status, we see that we have both branches modified app.js. We have to add app.js, and then we can commit the "Hello from local" merged with GitHub. Then we can push that. Now the changes are both locally and on GitHub.

[02:59] There''s one last thing, which is, if we do a git stash list right now, we still see our stash. We did git stash pop, and it didn''t come off. That''s because, if there''s a merge conflict, the code stays in the stash even if you do a pop, in case you mess up the merge conflict somehow. We have to get rid of this stash manually if we want to do that.

[03:18] We can do git stash drop. Then we''ll do the stash@{0and it dropped that stash. Now if we do a git stash list, it''s not in the stash anymore, so that''s cleaned up, and we still have it in our code over here.', NULL, true, '11-egghead-git-use-git-stash-to-save-local-changes-while-pulling.mp4', 210, true, false, 401, '---
mp4: 24558248
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r.mp4', 'scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r', 'zduX', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r.mp3?4ca863d2c9dc41cf?8407', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:03.998Z', NULL, 8388602, NULL, 7249, 0, NULL, 8374784, '2c5d3760c508481ea24b79b2540251f2', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 156529924, '1
00:00:00,740 --> 00:00:02,210
We are in a feature branch here 

2
00:00:02,210 --> 00:00:04,460
called JS changes. I want to 

3
00:00:04,550 --> 00:00:05,890
change my "Hello, world" 

4
00:00:05,890 --> 00:00:08,840
function to say, "Alert. Hi from 

5
00:00:08,840 --> 00:00:12,330
local." I will save that. Now if 

6
00:00:12,330 --> 00:00:14,460
I do a git status, I have 

7
00:00:14,720 --> 00:00:17,180
unstaged changes. What happens 

8
00:00:17,180 --> 00:00:18,210
if someone else changes that 

9
00:00:18,210 --> 00:00:20,480
file? If we go over to GitHub 

10
00:00:20,480 --> 00:00:22,700
here and go to our JS changes 

11
00:00:22,700 --> 00:00:24,970
branch, we can check out the app.

12
00:00:25,260 --> 00:00:27,970
js file. This is the last 

13
00:00:27,970 --> 00:00:29,470
version that was pushed. We can 

14
00:00:29,470 --> 00:00:30,820
actually edit it right here on 

15
00:00:30,820 --> 00:00:33,910
GitHub. Here I can say, "Alert. 

16
00:00:34,690 --> 00:00:39,270
Hi from GitHub." Down here, I 

17
00:00:39,270 --> 00:00:40,870
can commit that change. I can 

18
00:00:40,870 --> 00:00:45,090
say, "Hi from GitHub change." I 

19
00:00:45,090 --> 00:00:46,670
will commit directly to the JS 

20
00:00:46,670 --> 00:00:52,490
changes branch. Now our app.js 

21
00:00:52,510 --> 00:00:54,190
on GitHub says "Hi from GitHub." 

22
00:00:55,460 --> 00:00:56,960
Let''s go back to our code here, 

23
00:00:56,960 --> 00:01:00,610
then, and try a git pull. What 

24
00:01:00,610 --> 00:01:02,920
we get is that our local changes 

25
00:01:02,920 --> 00:01:04,380
will be overwritten by the merge. 

26
00:01:05,290 --> 00:01:06,760
We have to do something to 

27
00:01:06,760 --> 00:01:08,110
prevent our local changes from 

28
00:01:08,110 --> 00:01:09,720
being overwritten for now. It 

29
00:01:09,760 --> 00:01:10,940
says here our two options are to 

30
00:01:10,940 --> 00:01:13,210
stash them or commit them. We''re 

31
00:01:13,210 --> 00:01:14,570
going to show how to stash them 

32
00:01:14,600 --> 00:01:16,800
here. If we do git stash, then 

33
00:01:18,190 --> 00:01:19,080
it will take the code we just 

34
00:01:19,080 --> 00:01:20,500
wrote and put it in a special 

35
00:01:20,500 --> 00:01:22,860
stash. If we do git status, we 

36
00:01:22,860 --> 00:01:24,470
can see we have no changes right 

37
00:01:24,470 --> 00:01:28,290
here. If we do a git stash list, 

38
00:01:28,750 --> 00:01:30,390
we can see our change was added 

39
00:01:30,460 --> 00:01:34,400
over to the stash at zero. Now 

40
00:01:34,400 --> 00:01:37,590
we can do a git pull. Here is 

41
00:01:37,590 --> 00:01:39,040
our "Hello from GitHub" that we 

42
00:01:39,040 --> 00:01:40,820
added. Now we have to git our 

43
00:01:40,820 --> 00:01:42,780
stashed changes back. We can 

44
00:01:42,780 --> 00:01:45,980
always do git --help stash to 

45
00:01:45,980 --> 00:01:47,710
see how to get it back. The two 

46
00:01:47,710 --> 00:01:48,900
ways we might do that are pop 

47
00:01:49,470 --> 00:01:52,090
and apply. Pop and apply are 

48
00:01:52,090 --> 00:01:54,280
similar, but pop will remove the 

49
00:01:54,280 --> 00:01:55,920
change from the stash and 

50
00:01:55,920 --> 00:01:57,700
applies the change from the 

51
00:01:57,700 --> 00:01:59,290
stash but keeps it in the stash 

52
00:01:59,290 --> 00:02:00,720
as well, in case you want to use 

53
00:02:00,720 --> 00:02:02,960
it later. We''re going to git 

54
00:02:03,060 --> 00:02:06,290
stash pop. Here, we have another 

55
00:02:06,290 --> 00:02:07,420
problem, which is a merge 

56
00:02:07,420 --> 00:02:10,010
conflict. What happened is like 

57
00:02:10,010 --> 00:02:11,710
we committed this into the stash. 

58
00:02:12,310 --> 00:02:13,390
Now when we''re popping it off, 

59
00:02:13,390 --> 00:02:14,520
we get the same thing that we 

60
00:02:14,520 --> 00:02:15,690
would if we committed it, which 

61
00:02:15,690 --> 00:02:17,520
is a merge conflict. We have to 

62
00:02:17,520 --> 00:02:19,410
fix it. The way to fix merge 

63
00:02:19,410 --> 00:02:21,300
conflicts is just to manually go 

64
00:02:21,300 --> 00:02:22,990
in and do it. You have to figure 

65
00:02:22,990 --> 00:02:24,440
out what code you want to keep 

66
00:02:24,760 --> 00:02:26,300
and what code you want to get 

67
00:02:26,300 --> 00:02:27,670
rid of. In this case, we want 

68
00:02:27,670 --> 00:02:30,780
both. We are going to remove the 

69
00:02:30,780 --> 00:02:32,540
merge conflict lines. Now we 

70
00:02:32,540 --> 00:02:33,800
have both lines, "Alert from 

71
00:02:33,800 --> 00:02:35,190
GitHub" and "Alert from local." 

72
00:02:36,150 --> 00:02:38,120
We can save that. If we do a 

73
00:02:38,120 --> 00:02:40,740
git status, we see that we have 

74
00:02:41,770 --> 00:02:43,840
both branches modified app.js. 

75
00:02:43,940 --> 00:02:46,200
We have to add app.js, and then 

76
00:02:46,200 --> 00:02:49,380
we can commit the "Hello from 

77
00:02:49,450 --> 00:02:53,680
local" merged with GitHub. Then 

78
00:02:53,790 --> 00:02:56,290
we can push that. Now the 

79
00:02:56,290 --> 00:02:58,240
changes are both locally and on 

80
00:02:58,240 --> 00:03:00,470
GitHub. There''s one last thing, 

81
00:03:00,470 --> 00:03:01,820
which is, if we do a git stash 

82
00:03:01,880 --> 00:03:04,390
list right now, we still see our 

83
00:03:04,390 --> 00:03:07,150
stash. We did git stash pop, and 

84
00:03:07,150 --> 00:03:08,250
it didn''t come off. That''s 

85
00:03:08,250 --> 00:03:09,440
because, if there''s a merge 

86
00:03:09,440 --> 00:03:11,030
conflict, the code stays in the 

87
00:03:11,030 --> 00:03:13,480
stash even if you do a pop, in 

88
00:03:13,480 --> 00:03:14,550
case you mess up the merge 

89
00:03:14,550 --> 00:03:16,090
conflict somehow. We have to get 

90
00:03:16,190 --> 00:03:17,670
rid of this stash manually if we 

91
00:03:17,670 --> 00:03:19,140
want to do that. We can do git 

92
00:03:19,140 --> 00:03:22,400
stash drop. Then we''ll do the 

93
00:03:22,400 --> 00:03:26,090
stash@{0and it dropped that 

94
00:03:26,090 --> 00:03:27,800
stash. Now if we do a git stash 

95
00:03:27,800 --> 00:03:29,440
list, it''s not in the stash 

96
00:03:29,440 --> 00:03:30,510
anymore, so that''s cleaned up, 

97
00:03:31,160 --> 00:03:32,590
and we still have it in our code 

98
00:03:32,590 --> 00:03:33,150
over here.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# Save the local changes,
git stash

# Get remote changes
git pull

# To apply the stashed changed
git stash pop

# You will need to  fix the merge conflict
# Then drop the change from the stash
git stash drop stash@{0}
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'fab4b59c', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r/dash/scikit-learn-use-git-stash-to-save-local-changes-while-pulling-SyVAOqn3r.mpd', 'https://stream.mux.com/ZatpP4jMx02AVmCxJZXB53rDcb0200k7sFYy24602NyiQUM.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5782, 'Explore Old Commits with a Detached HEAD, and then Recover', NULL, 'To poke around in old code, we can checkout the hash of an old commit with `git checkout [HASH]` - but then we''ll be in a "detached HEAD" state.

Detached HEAD just means that HEAD is not pointing to a branch.  That''s problematic if we want to save the work that we do in that state - so we first have to make a new branch where we are with `git checkout -b my-new-branch`

Then, any changes we make can be committed to that new branched and saved.', 84, NULL, '2019-11-28T08:51:30.737Z', '2025-12-13T00:54:53.678Z', 'git-explore-old-commits-with-a-detached-head-and-then-recover', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS.jpg', true, NULL, 'Instructor: [00:00] Let''s look at our local git log with git log one line. Let''s go all the way back to where we added the index.html and app.js files.

[00:10] If we want to explore what the code looked like at that time, we can gitCheckout this hash. Now, it says we''re in a detached head state. If we go look at our app.js code, this is when we first edited, just had the comment at the top.

[00:25] What a detached head means if we do a git log one line, we can see that our head is not pointing to a branch right now. Instead, it''s pointing to a commit. This is problematic because if we make changes right now, and then move our head away, then those changes could be lost.

[00:42] We could just poke around and then switch to a branch, and that would be fine. If we want to make changes here, then what we have to do is do what it says right here, which is to check out a new branch at this hash. We''re going to gitCheckout a new branch, and we''ll just call this exploring a JS feature.

[00:59] If we do get status, we''re no longer in a detached head state. If we do git log online, we can see that our head is now successfully pointing to a branch. Now, any changes we make here won''t get lost. If you do get branch -vv now, you can see our new branch here, which is not a remote branch, and it''s different than the other two branches, which are remote branches.', NULL, true, '12-egghead-git-explore-old-commits-with-a-detached-head-and-then-recover.mp4', 210, true, false, 401, '---
mp4: 9416966
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS.mp4', 'scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS', 'zduZ', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS.mp3?0361afe3044ee100?7dc1', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.028Z', NULL, 8388602, NULL, 7250, 0, NULL, 8380928, '3e5b7d3362be4449afb5d235dd0ac10d', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 157200280, '1
00:00:00,800 --> 00:00:02,280
Let''s look at our local git log 

2
00:00:02,280 --> 00:00:04,700
with git log one line. Let''s go 

3
00:00:04,700 --> 00:00:06,140
all the way back to where we 

4
00:00:06,190 --> 00:00:09,690
added the index.html and app.js 

5
00:00:09,690 --> 00:00:11,580
files. If we want to explore 

6
00:00:11,580 --> 00:00:12,630
what the code looked like at 

7
00:00:12,630 --> 00:00:14,160
that time, we can gitCheckout 

8
00:00:14,820 --> 00:00:18,850
this hash. Now, it says we''re in 

9
00:00:18,850 --> 00:00:20,960
a detached head state. If we go 

10
00:00:20,960 --> 00:00:22,520
look at our app.js code, this is 

11
00:00:22,520 --> 00:00:24,190
when we first edited, just had 

12
00:00:24,190 --> 00:00:26,150
the comment at the top. What a 

13
00:00:26,150 --> 00:00:28,090
detached head means if we do a 

14
00:00:28,090 --> 00:00:30,150
git log one line, we can see 

15
00:00:30,150 --> 00:00:31,770
that our head is not pointing to 

16
00:00:31,770 --> 00:00:33,420
a branch right now. Instead, 

17
00:00:33,420 --> 00:00:35,450
it''s pointing to a commit. This 

18
00:00:35,450 --> 00:00:36,700
is problematic because if we 

19
00:00:36,700 --> 00:00:38,470
make changes right now, and then 

20
00:00:38,470 --> 00:00:40,670
move our head away, then those 

21
00:00:40,670 --> 00:00:42,550
changes could be lost. We could 

22
00:00:42,550 --> 00:00:44,070
just poke around and then switch 

23
00:00:44,070 --> 00:00:45,010
to a branch, and that would be 

24
00:00:45,010 --> 00:00:46,980
fine. If we want to make changes 

25
00:00:46,980 --> 00:00:48,700
here, then what we have to do is 

26
00:00:48,780 --> 00:00:49,780
do what it says right here, 

27
00:00:49,780 --> 00:00:51,820
which is to check out a new 

28
00:00:51,820 --> 00:00:53,670
branch at this hash. We''re going 

29
00:00:53,670 --> 00:00:55,830
to gitCheckout a new branch, and 

30
00:00:55,830 --> 00:00:57,400
we''ll just call this exploring a 

31
00:00:57,400 --> 00:01:00,610
JS feature. If we do get status, 

32
00:01:01,150 --> 00:01:02,510
we''re no longer in a detached 

33
00:01:02,510 --> 00:01:04,360
head state. If we do git log 

34
00:01:04,360 --> 00:01:06,740
online, we can see that our head 

35
00:01:06,740 --> 00:01:08,400
is now successfully pointing to 

36
00:01:08,470 --> 00:01:10,480
a branch. Now, any changes we 

37
00:01:10,480 --> 00:01:12,300
make here won''t get lost. If you 

38
00:01:12,300 --> 00:01:15,580
do get branch -vv now, you can 

39
00:01:15,580 --> 00:01:17,590
see our new branch here, which 

40
00:01:17,590 --> 00:01:19,920
is not a remote branch, and it''s 

41
00:01:19,920 --> 00:01:20,860
different than the other two 

42
00:01:20,860 --> 00:01:21,950
branches, which are remote 

43
00:01:22,025 --> 00:01:22,350
branches.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# checkout the hash of an old commit
git checkout [HASH]

# we''ll be in a "detached HEAD" state
# Save the work by creating a new branch
git checkout -b my-new-branch
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '4ac6593d', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS/dash/scikit-learn-explore-old-commits-with-a-detached-head-and-then-recover-By1m992hS.mpd', 'https://stream.mux.com/01Dm701vOaa9Aeex49pNawfvzDrka2cDn1GgrH025ySvkU.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5783, 'Fix a Pull Request that has a Merge Conflict', NULL, 'If we try to make a pull request on github that has a conflict, there are a few ways to fix it.

We''re going to first back out of the pull request, and then merge `master` into our feature branch.

We''ll manage the merge conflict locally, and then do a new pull request (which will not have the conflict)', 140, NULL, '2019-11-28T10:01:32.840Z', '2020-12-29T04:46:54.542Z', 'git-fix-a-pull-request-that-has-a-merge-conflict', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB.jpg', true, NULL, NULL, NULL, true, '13-egghead-git-fix-a-pull-request-that-has-a-merge-conflict.mp4', 210, true, false, 401, '---
mp4: 15685023
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB.mp4', 'scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB', 'zduk', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB.mp3?11b929885e856fee?3dc0', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.136Z', NULL, 8388602, NULL, 7251, 0, NULL, 8386688, '23ae9d42444f420ab4bc631ec93af051', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 157870636, NULL, false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
git checkout -b conflicts_branch

# Add ''Line4'' and ''Line5''

git commit -am "add line4 and line5"
git push origin conflicts_branch

git checkout master

# Add ''Line6'' and ''Line7''`
git commit -am "add line6 and line7"
git push origin master
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'd3a82b30', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB/dash/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB.mpd', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB/hls/scikit-learn-fix-a-pull-request-that-has-a-merge-conflict-HkYYci3nB.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5784, 'Cleanup and Delete Branches After a Pull Request', NULL, 'We''ve made a pull request and now we can clean up the branches by deleting the feature branch.

Branches are just pointers to commits - so we can safely delete branches without losing the underlying commits (once the commits are merged back into master).

So we''ll use the github interface to delete the branch remotely, and to delete it locally we''ll use `git remote prune origin --dry-run` and then `git remote prune origin`

That will tell us that the remote is gone, and we can finally clean up the feature branch with: `git branch -d feature-branch`', 131, NULL, '2019-11-28T10:21:14.577Z', '2025-12-13T00:54:53.678Z', 'git-cleanup-and-delete-branches-after-a-pull-request', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B.jpg', true, NULL, 'Instructor: [0:00] We have just successfully merged this pull request and now we can click delete branch to clean it up. Let''s take a look at why we can do that. Back in our code, we can do git branch -vv to see that master and that jsChanges both point to origin.

[0:17] If we do a git log oneline and we can add graph here to see our merge graph, we can see that these branches are really just pointers to these hashes. Deleting a branch is just deleting the pointer and not deleting the actual commit.

[0:33] Importantly, the jsChanges branch is pointing to a commit, which is in the master tree now. Deleting this branch won''t lose the commit because the commit''s in this tree. However, if we do git branch here, we see that jsChanges still exists locally. If we do git branch -vv, it even thinks that it exists in the origin still, but we''ve deleted that on GitHub.

[0:55] We can tell it that it''s gone by doing git remote prune origin. If we want, we can do a dry run first, and it will go to GitHub and say that it would prune the jsChanges branch, because that no longer exists on our remote. Let''s do that. We do git remote prune origin, and it has pruned the jsChanges branch.

[1:18] If we do branch -vv, we still have the jsChanges branch. It points to origin jsChanges, but it says it''s gone. This is how we know that we can now successfully delete the jsChanges branch. We can do git branch -d, or delete, jsChanges. Now if we do git branch -vv, that branch is now gone. We just have the exploring jsFeature branch and the master branch left.

[1:48] Now, notice it gives the hash here, so we can get that branch back if we wanted to. We can even go to git reflog and see all of the changes that we just made. Reflog is a way to get back to a commit even if you''ve deleted the branch that it was on. We could check out any of these hashes that we want and get back to code even if we''ve deleted the branch that it was on.', NULL, true, '14-egghead-git-cleanup-and-delete-branches-after-a-pull-request.mp4', 210, true, false, 401, '---
mp4: 16263231
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B.mp4', 'scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B', 'zdu8', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B.mp3?c961d4738e848d65?0d0a', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.437Z', NULL, 8388602, NULL, 7253, 0, NULL, 8387616, '45ec47a3779d4e0f8e8aa363c271420a', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 158540992, '1
00:00:00,200 --> 00:00:01,560
We have just successfully merged 

2
00:00:01,560 --> 00:00:03,090
this pull request and now we can 

3
00:00:03,090 --> 00:00:05,890
click delete branch to clean it 

4
00:00:05,890 --> 00:00:07,600
up. Let''s take a look at why we 

5
00:00:07,600 --> 00:00:09,560
can do that. Back in our code, 

6
00:00:09,560 --> 00:00:12,780
we can do git branch -vv to see 

7
00:00:12,780 --> 00:00:15,440
that master and that jsChanges 

8
00:00:15,800 --> 00:00:18,100
both point to origin. If we do 

9
00:00:18,100 --> 00:00:20,790
a git log oneline and we can add 

10
00:00:20,790 --> 00:00:22,410
graph here to see our merge 

11
00:00:22,410 --> 00:00:24,650
graph, we can see that these 

12
00:00:24,650 --> 00:00:25,740
branches are really just 

13
00:00:25,810 --> 00:00:27,310
pointers to these hashes. 

14
00:00:28,150 --> 00:00:29,480
Deleting a branch is just 

15
00:00:29,480 --> 00:00:31,000
deleting the pointer and not 

16
00:00:31,000 --> 00:00:32,360
deleting the actual commit. 

17
00:00:33,080 --> 00:00:35,190
Importantly, the jsChanges 

18
00:00:35,220 --> 00:00:36,910
branch is pointing to a commit, 

19
00:00:37,020 --> 00:00:38,740
which is in the master tree now. 

20
00:00:39,550 --> 00:00:40,940
Deleting this branch won''t lose 

21
00:00:40,940 --> 00:00:42,090
the commit because the commit''s 

22
00:00:42,140 --> 00:00:44,180
in this tree. However, if we do 

23
00:00:44,180 --> 00:00:46,100
git branch here, we see that 

24
00:00:46,170 --> 00:00:48,050
jsChanges still exists locally. 

25
00:00:48,710 --> 00:00:50,910
If we do git branch -vv, it even 

26
00:00:50,910 --> 00:00:52,410
thinks that it exists in the 

27
00:00:52,440 --> 00:00:54,540
origin still, but we''ve deleted 

28
00:00:54,540 --> 00:00:56,670
that on GitHub. We can tell it 

29
00:00:56,670 --> 00:00:58,000
that it''s gone by doing git 

30
00:00:58,030 --> 00:01:01,380
remote prune origin. If we want, 

31
00:01:01,380 --> 00:01:04,280
we can do a dry run first, and 

32
00:01:04,280 --> 00:01:05,710
it will go to GitHub and say 

33
00:01:05,970 --> 00:01:06,970
that it would prune the 

34
00:01:07,180 --> 00:01:08,560
jsChanges branch, because that 

35
00:01:08,560 --> 00:01:10,220
no longer exists on our remote. 

36
00:01:11,090 --> 00:01:12,750
Let''s do that. We do git remote 

37
00:01:13,100 --> 00:01:16,520
prune origin, and it has pruned 

38
00:01:16,520 --> 00:01:19,310
the jsChanges branch. If we do 

39
00:01:19,310 --> 00:01:22,100
branch -vv, we still have the 

40
00:01:22,310 --> 00:01:25,180
jsChanges branch. It points to 

41
00:01:25,180 --> 00:01:26,960
origin jsChanges, but it says 

42
00:01:27,060 --> 00:01:29,440
it''s gone. This is how we know 

43
00:01:29,660 --> 00:01:30,950
that we can now successfully 

44
00:01:30,950 --> 00:01:33,310
delete the jsChanges branch. We 

45
00:01:33,310 --> 00:01:37,040
can do git branch -d, or delete, 

46
00:01:37,360 --> 00:01:40,230
jsChanges. Now if we do git 

47
00:01:40,250 --> 00:01:43,470
branch -vv, that branch is now 

48
00:01:43,470 --> 00:01:45,350
gone. We just have the exploring 

49
00:01:45,350 --> 00:01:46,970
jsFeature branch and the master 

50
00:01:46,970 --> 00:01:49,410
branch left. Now, notice it 

51
00:01:49,410 --> 00:01:51,350
gives the hash here, so we can 

52
00:01:51,540 --> 00:01:52,790
get that branch back if we 

53
00:01:52,790 --> 00:01:55,050
wanted to. We can even go to git 

54
00:01:55,260 --> 00:01:57,950
reflog and see all of the 

55
00:01:57,950 --> 00:01:59,050
changes that we just made. 

56
00:01:59,810 --> 00:02:01,590
Reflog is a way to get back to a 

57
00:02:01,590 --> 00:02:02,940
commit even if you''ve deleted 

58
00:02:02,940 --> 00:02:04,700
the branch that it was on. We 

59
00:02:04,700 --> 00:02:05,790
could check out any of these 

60
00:02:05,790 --> 00:02:07,600
hashes that we want and get back 

61
00:02:07,630 --> 00:02:09,170
to code even if we''ve deleted 

62
00:02:09,170 --> 00:02:10,280
the branch that it was on.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# use the github interface to delete the branch remotely

# Locally
# Confirm that remote is gone
git remote prune origin --dry-run
git remote prune origin

#clean up the feature branch
git branch -d feature-branch
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '3630f106', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B/dash/scikit-learn-cleanup-and-delete-branches-after-a-pull-request-S1PQJh33B.mpd', 'https://stream.mux.com/93cPolHhIJc99KpPZpjzmEkBGkhaVnBAa9WQb52Zgdg.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5785, 'Change the Commit Message of a Previous Commit with Interactive Rebase', NULL, 'We''ll go back into our history with

`git log --oneline`

and then we can pick a previous commit and change its commit message with an interactive rebase.  (Note: you shouldn''t try to do this on commits that have already been pushed - only commits you still have locally)

To start the interactive rebase, we''ll use:

`git rebase -i HEAD~3`

and then change `pick` to `reword`.  Then we can reword the commit message and the commit will be rewritten for us.', 155, NULL, '2019-11-28T10:46:27.488Z', '2025-12-13T00:54:53.678Z', 'git-change-the-commit-message-of-a-previous-commit-with-interactive-rebase', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H.jpg', true, NULL, 'Instructor: [00:00] We are on the master branch of our project and if we do a log one line, we can see all of the commits we have.

[00:07] Let''s say we want to change an old commit message. The first thing I''ll say is that we shouldn''t want to change commit messages that are in the past on the origin. That means we''ve already pushed them and someone may have pulled them and we don''t want to rewrite history that someone may have already pulled. Instead, we''re going to make some new changes so we can play with that.

[00:26] We''re going to alert this is our first change, let''s save that. If we do a status, then that has been changed. We''re going to add app.js and commit our change one. We''re going to duplicate that for change two, do the same thing, we''re going to add app.js and commit change two. Do the same thing for a third change. We''re going to add app.js and commit change three.

[00:57] Now if we do a log one line, we have some commits here that are in front of the origin master. We can change this without worrying about rewriting history that someone else may have pulled.

[01:09] What if I want to change this change one message to something else? For that, we''re going to use rebase interactive. I''m going to do a git rebase and a - i for interactive. I want to go back three commits to change it.

[01:22] I''m going to do head ~ 3, which is going to rebase all the way back to this commit, but leave that one alone and just give me access to these three. I hit enter here. This is the git rebase interactive interface. Just open the text editor here and the default is pick, which means leave this commits alone.

[01:44] I also have all these options for my commits. In this case, I want to reword the commit. I''m going to hit I to enter insert mode and I''m going to change this pick to reword and hit escape:wq because this is VI and I need to save it. I''ve entered the commit message for change one.

[02:05] You can see over here, we just have change one in our editor because we''re on the change one commit. Over here, I could hit I again for insert and this is the change one new commit message. I can hit escape wq.

[02:20] Now, if I do a git log one line, we can see first of all that we''ve successfully rebased. Our commit message here was changed and two and three were left alone and we''re back on master, which has all three changes.', NULL, true, '15-egghead-git-change-the-commit-message-of-a-previous-commit-with-interactive-rebase.mp4', 210, true, false, 401, '---
mp4: 19347786
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H.mp4', 'scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H', 'zdug', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H.mp3?745451703a24e261?9e47', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.214Z', NULL, 8388602, NULL, 7254, 0, NULL, 8388000, 'a34c0b9328674d8ab7aa5bebdcd26d23', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 159211348, '1
00:00:00,150 --> 00:00:01,610
We are on the master branch of 

2
00:00:01,610 --> 00:00:03,620
our project and if we do a log 

3
00:00:03,800 --> 00:00:05,790
one line, we can see all of the 

4
00:00:05,790 --> 00:00:07,990
commits we have. Let''s say we 

5
00:00:07,990 --> 00:00:09,420
want to change an old commit 

6
00:00:09,420 --> 00:00:11,130
message. The first thing I''ll 

7
00:00:11,130 --> 00:00:12,470
say is that we shouldn''t want to 

8
00:00:12,470 --> 00:00:14,160
change commit messages that are 

9
00:00:14,160 --> 00:00:16,470
in the past on the origin. That 

10
00:00:16,520 --> 00:00:17,750
means we''ve already pushed them 

11
00:00:18,180 --> 00:00:19,300
and someone may have pulled them 

12
00:00:19,820 --> 00:00:20,810
and we don''t want to rewrite 

13
00:00:20,810 --> 00:00:21,860
history that someone may have 

14
00:00:21,860 --> 00:00:24,030
already pulled. Instead, we''re 

15
00:00:24,030 --> 00:00:25,290
going to make some new changes 

16
00:00:25,290 --> 00:00:26,530
so we can play with that. We''re 

17
00:00:26,530 --> 00:00:28,150
going to alert this is our first 

18
00:00:28,150 --> 00:00:30,940
change, let''s save that. If we 

19
00:00:30,940 --> 00:00:32,090
do a status, then that has been 

20
00:00:32,090 --> 00:00:33,700
changed. We''re going to add app.

21
00:00:33,770 --> 00:00:36,620
js and commit our change one. 

22
00:00:38,440 --> 00:00:39,910
We''re going to duplicate that 

23
00:00:40,000 --> 00:00:41,880
for change two, do the same 

24
00:00:41,880 --> 00:00:43,490
thing, we''re going to add app.js 

25
00:00:44,050 --> 00:00:47,520
and commit change two. Do the 

26
00:00:47,520 --> 00:00:49,420
same thing for a third change. 

27
00:00:49,540 --> 00:00:52,490
We''re going to add app.js and 

28
00:00:52,490 --> 00:00:57,930
commit change three. Now if we 

29
00:00:57,930 --> 00:01:01,270
do a log one line, we have some 

30
00:01:01,270 --> 00:01:02,800
commits here that are in front 

31
00:01:02,860 --> 00:01:04,460
of the origin master. We can 

32
00:01:04,460 --> 00:01:05,920
change this without worrying 

33
00:01:05,950 --> 00:01:07,570
about rewriting history that 

34
00:01:07,570 --> 00:01:08,530
someone else may have pulled. 

35
00:01:09,510 --> 00:01:11,100
What if I want to change this 

36
00:01:11,270 --> 00:01:12,840
change one message to something 

37
00:01:12,840 --> 00:01:14,170
else? For that, we''re going to 

38
00:01:14,170 --> 00:01:16,230
use rebase interactive. I''m 

39
00:01:16,230 --> 00:01:18,620
going to do a git rebase and a - 

40
00:01:18,820 --> 00:01:21,240
i for interactive. I want to go 

41
00:01:21,240 --> 00:01:22,960
back three commits to change it. 

42
00:01:22,960 --> 00:01:26,240
I''m going to do head ~ 3, which 

43
00:01:26,240 --> 00:01:27,980
is going to rebase all the way 

44
00:01:27,980 --> 00:01:30,330
back to this commit, but leave 

45
00:01:30,330 --> 00:01:31,740
that one alone and just give me 

46
00:01:31,760 --> 00:01:34,250
access to these three. I hit 

47
00:01:34,250 --> 00:01:36,540
enter here. This is the git 

48
00:01:36,540 --> 00:01:38,410
rebase interactive interface. 

49
00:01:39,070 --> 00:01:40,600
Just open the text editor here 

50
00:01:40,840 --> 00:01:42,740
and the default is pick, which 

51
00:01:42,740 --> 00:01:44,160
means leave this commits alone. 

52
00:01:44,940 --> 00:01:46,820
I also have all these options 

53
00:01:47,190 --> 00:01:48,960
for my commits. In this case, I 

54
00:01:48,960 --> 00:01:51,190
want to reword the commit. I''m 

55
00:01:51,190 --> 00:01:52,670
going to hit I to enter insert 

56
00:01:52,670 --> 00:01:54,500
mode and I''m going to change 

57
00:01:54,500 --> 00:01:57,740
this pick to reword and hit 

58
00:01:57,740 --> 00:02:01,310
escape:wq because this is VI and 

59
00:02:01,310 --> 00:02:03,240
I need to save it. I''ve entered 

60
00:02:03,240 --> 00:02:05,220
the commit message for change 

61
00:02:05,220 --> 00:02:06,680
one. You can see over here, we 

62
00:02:06,680 --> 00:02:07,900
just have change one in our 

63
00:02:07,930 --> 00:02:09,570
editor because we''re on the 

64
00:02:09,570 --> 00:02:11,720
change one commit. Over here, I 

65
00:02:11,720 --> 00:02:13,860
could hit I again for insert and 

66
00:02:13,860 --> 00:02:15,940
this is the change one new 

67
00:02:16,020 --> 00:02:18,580
commit message. I can hit escape 

68
00:02:18,780 --> 00:02:22,110
wq. Now, if I do a git log one 

69
00:02:22,110 --> 00:02:24,090
line, we can see first of all 

70
00:02:24,090 --> 00:02:25,570
that we''ve successfully rebased. 

71
00:02:26,830 --> 00:02:28,610
Our commit message here was 

72
00:02:28,610 --> 00:02:30,460
changed and two and three were 

73
00:02:30,460 --> 00:02:32,520
left alone and we''re back on 

74
00:02:32,520 --> 00:02:33,920
master, which has all three 

75
00:02:33,995 --> 00:02:34,320
changes.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
git log --oneline

# start the interactive rebase
git rebase -i HEAD~3
# and then change pick to reword.
# We can now reword the commit message
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '43110292', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H/dash/scikit-learn-change-the-commit-message-of-a-previous-commit-with-interactive-rebase-B1gGH3n3H.mpd', 'https://stream.mux.com/5IwJERGmRC01J001TZOr2r5TUCH5rrZtsZLB01uHd7O202U.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5786, 'Add a File to a Previous Commit with Interactive Rebase', NULL, 'We''re going to pick a previous commit and enter an interactive rebase with:

`git rebase -i HEAD~2`

and change the word `pick` to `edit` on the commit where we want to add a file.

Then during the interactive rebase, we can add the file, and amend the commit we stopped on with:

`git commit --amend --no-edit`

and then once we''re happy, continue the rebase with:

`git rebase --continue`', 116, NULL, '2019-11-28T10:56:18.738Z', '2025-12-13T00:54:53.678Z', 'git-add-a-file-to-a-previous-commit-with-interactive-rebase', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B.jpg', true, NULL, 'Instructor: [0:00] Let''s do a git log oneline here. We can see three commits that we haven''t pushed yet. Let''s say we want to add a file to this change to commit. I''m going to do a rebase interactive, so git rebase -i, and I want to go back two commits, so I want to go HEAD~2. I enter rebase interactive mode.

[0:24] Instead of pick, I''m going to choose edit for this top commit. I''m going to enter i for insert mode, and I''m going to change pick to edit, and I''m going to hit <esc> :wq to save the file. Now I am currently in a rebase. It says it stopped at, and then it has the #. If I do a git status, it tells me I''m in an interactive rebase that''s in progress.

[0:48] Let''s make a new file here. I''m going to touch secondapp.js. If I go into secondapp.js, I can say, "This is an interactive rebase." Let''s save that now and do a git status.

[1:04] We have secondapp. We are still in our interactive rebase. Let''s add secondapp.js. Then we can do git commit. We''re in a commit currently. I want to amend that commit. I''m going to say no edit because I want to keep the message the same.

[1:23] If I do a git status, it says we''re still in the interactive rebase but there''s nothing to add because we''ve added this to the commit. Now it tells me here that I can do git rebase continue to continue the rebase. Git rebase continue will successfully rebase.

[1:41] If I do a log oneline now, then the commit here is the same, but the hash has changed. My secondapp still exists on master now. I''ve effectively added secondapp to this commit.', NULL, true, '17-egghead-git-add-a-file-to-a-previous-commit-with-interactive-rebase.mp4', 210, true, false, 401, '---
mp4: 14031876
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B.mp4', 'scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B', 'zduc', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B.mp3?b2094ebb2dfefea7?5121', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.351Z', NULL, 8388602, NULL, 7255, 0, NULL, 8388392, '57a49edd4ea5459dbb2a4b38d1d09257', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 159881704, '1
00:00:00,750 --> 00:00:02,580
Let''s do a git log oneline here. 

2
00:00:04,540 --> 00:00:06,210
We can see three commits that we 

3
00:00:06,210 --> 00:00:08,150
haven''t pushed yet. Let''s say we 

4
00:00:08,150 --> 00:00:10,230
want to add a file to this 

5
00:00:10,270 --> 00:00:12,450
change to commit. I''m going to 

6
00:00:12,450 --> 00:00:14,350
do a rebase interactive, so git 

7
00:00:14,460 --> 00:00:17,470
rebase -i, and I want to go back 

8
00:00:17,540 --> 00:00:18,670
two commits, so I want to go 

9
00:00:18,670 --> 00:00:23,010
HEAD~2. I enter rebase 

10
00:00:23,010 --> 00:00:24,960
interactive mode. Instead of 

11
00:00:24,960 --> 00:00:26,770
pick, I''m going to choose edit 

12
00:00:26,970 --> 00:00:28,370
for this top commit. I''m going 

13
00:00:28,370 --> 00:00:29,820
to enter i for insert mode, and 

14
00:00:30,430 --> 00:00:32,130
I''m going to change pick to edit, 

15
00:00:33,260 --> 00:00:35,710
and I''m going to hit <esc> :wq 

16
00:00:35,880 --> 00:00:38,370
to save the file. Now I am 

17
00:00:38,370 --> 00:00:40,030
currently in a rebase. It says 

18
00:00:40,030 --> 00:00:41,690
it stopped at, and then it has 

19
00:00:41,690 --> 00:00:44,860
the #. If I do a git status, it 

20
00:00:44,860 --> 00:00:46,520
tells me I''m in an interactive 

21
00:00:46,520 --> 00:00:47,760
rebase that''s in progress. 

22
00:00:48,540 --> 00:00:50,070
Let''s make a new file here. I''m 

23
00:00:50,070 --> 00:00:54,090
going to touch secondapp.js. If 

24
00:00:54,090 --> 00:00:56,380
I go into secondapp.js, I can 

25
00:00:56,380 --> 00:00:58,920
say, "This is an interactive 

26
00:00:59,170 --> 00:01:02,580
rebase." Let''s save that now and 

27
00:01:02,580 --> 00:01:04,830
do a git status. We have 

28
00:01:04,830 --> 00:01:06,380
secondapp. We are still in our 

29
00:01:06,380 --> 00:01:08,490
interactive rebase. Let''s add 

30
00:01:09,270 --> 00:01:12,580
secondapp.js. Then we can do git 

31
00:01:12,670 --> 00:01:14,770
commit. We''re in a commit 

32
00:01:14,930 --> 00:01:17,050
currently. I want to amend that 

33
00:01:17,050 --> 00:01:19,900
commit. I''m going to say no edit 

34
00:01:20,110 --> 00:01:21,000
because I want to keep the 

35
00:01:21,000 --> 00:01:23,930
message the same. If I do a git 

36
00:01:23,930 --> 00:01:26,210
status, it says we''re still in 

37
00:01:26,210 --> 00:01:27,590
the interactive rebase but 

38
00:01:27,590 --> 00:01:29,450
there''s nothing to add because 

39
00:01:29,450 --> 00:01:30,980
we''ve added this to the commit. 

40
00:01:31,750 --> 00:01:32,930
Now it tells me here that I can 

41
00:01:32,930 --> 00:01:35,800
do git rebase continue to 

42
00:01:35,800 --> 00:01:37,600
continue the rebase. Git rebase 

43
00:01:37,720 --> 00:01:40,750
continue will successfully 

44
00:01:40,800 --> 00:01:43,380
rebase. If I do a log oneline 

45
00:01:43,380 --> 00:01:46,990
now, then the commit here is the 

46
00:01:46,990 --> 00:01:48,780
same, but the hash has changed. 

47
00:01:49,650 --> 00:01:51,700
My secondapp still exists on 

48
00:01:51,700 --> 00:01:53,740
master now. I''ve effectively 

49
00:01:53,800 --> 00:01:55,700
added secondapp to this commit.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
git rebase -i HEAD~2

# during the interactive rebase, we can add the file, and amend the commi
git commit --amend --no-edit

git rebase --continue
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'f574ce4b', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B/dash/scikit-learn-add-a-file-to-a-previous-commit-with-interactive-rebase-r1eDPhh2B.mpd', 'https://stream.mux.com/Ht5HOHvjOxW8dbYpe8eZXjAZFhpHvUNddYPAjTQuHWA.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5787, 'Fix Merge Conflicts While Changing Commits During an Interactive Rebase', NULL, 'We''ll enter a more complicated interactive rebase with:

`git rebase -i HEAD~2`

and intentionally cause a merge conflict in a previous commit.

Then we can fix that merge conflict like normal, but finish up the rebase with:

`git rebase --continue`', 156, NULL, '2019-11-28T11:04:23.294Z', '2025-12-13T00:54:53.678Z', 'git-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS.jpg', true, NULL, 'Instructor: [0:00] If we do git log oneline, we have our three commits which are not pushed yet. Let''s say we want to change this commit2 and do a more complicated change here.

[0:11] We''re going to rebase -i, for interactive, we''re going to say HEAD~2, and we want to edit instead of pick the change2. I''m going to enter insert mode with i in vi here, change that to edit, and hit <esc> :wq. Now I''m in an interactive rebase. We can see that with git status. We''re currently in a rebase onto this hash.

[0:42] Let''s go to app.js. I''m going to change my change2 to say change2-inARebase, and save that. If I look at git status, my app has changed. I''m going to add app.js, and then commit it with --amend, because we want to add it to the current commit that we''re rebasing. I''m going to say --no-edit, to not change the message.

[1:11] If I look at the instructions, it says I can git rebase --continue, so let''s try to do that. If we do git rebase --continue, we''ll get into a merge conflict during a rebase. This is going to happen if you go back in time and change a file that also gets changed later, which is exactly what happened.

[1:29] Let''s take a look. We see both modified app.js, so let''s go into app.js to change that. Just like any other merge conflict, we have to clean this up manually. There''s no easy way to do this. We''re going to get rid of the merge conflict lines. We have both change2 and the change2-inARebase. We just want that top one, so we''ll get rid of change2. We can save that.

[1:54] We have app.js that needs to be added, so we can add app.js again. We can commit it now with a new message that is the, "Merge rebase changes2 into changes3." We could have amended the current commit we''re in, or we can make a new one like this. Then, we can rebase --continue. It says we''ve successfully rebased all the way to the top.

[2:21] Let''s check it out. Let''s do git log oneline. We have change1, change2. This now is the merge commit for both 2 and 3. That is a more complicated interactive rebase, but it gets us to the code that we finally wanted.', NULL, true, '18-egghead-git-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase.mp4', 210, true, false, 401, '---
mp4: 19782188
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS.mp4', 'scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS', 'zduD', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS.mp3?160af2bbb5c5f17f?2448', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.263Z', NULL, 8388602, NULL, 7256, 0, NULL, 8388548, 'c238f05f8a67452f84c91ece586bafb3', NULL, 265830, 'free', '', '', '', 'git', '', '', '', NULL, 160552060, '1
00:00:00,490 --> 00:00:03,140
If we do git log oneline, we 

2
00:00:03,140 --> 00:00:05,130
have our three commits which are 

3
00:00:05,130 --> 00:00:07,310
not pushed yet. Let''s say we 

4
00:00:07,310 --> 00:00:09,700
want to change this commit2 and 

5
00:00:09,700 --> 00:00:11,240
do a more complicated change 

6
00:00:11,240 --> 00:00:14,070
here. We''re going to rebase -i, 

7
00:00:14,070 --> 00:00:17,050
for interactive, we''re going to 

8
00:00:18,780 --> 00:00:23,070
say HEAD~2, and we want to edit 

9
00:00:23,570 --> 00:00:25,430
instead of pick the change2. I''m 

10
00:00:25,430 --> 00:00:26,550
going to enter insert mode with 

11
00:00:26,550 --> 00:00:29,160
i in vi here, change that to 

12
00:00:29,160 --> 00:00:34,500
edit, and hit <esc> :wq. Now I''m 

13
00:00:34,620 --> 00:00:36,420
in an interactive rebase. We can 

14
00:00:36,420 --> 00:00:39,280
see that with git status. We''re 

15
00:00:39,280 --> 00:00:41,830
currently in a rebase onto this 

16
00:00:41,830 --> 00:00:45,490
hash. Let''s go to app.js. I''m 

17
00:00:45,490 --> 00:00:47,450
going to change my change2 to 

18
00:00:47,450 --> 00:00:52,030
say change2-inARebase, and save 

19
00:00:52,030 --> 00:00:55,430
that. If I look at git status, 

20
00:00:56,060 --> 00:00:58,330
my app has changed. I''m going to 

21
00:00:58,390 --> 00:01:01,730
add app.js, and then commit it 

22
00:01:02,620 --> 00:01:04,410
with --amend, because we want to 

23
00:01:04,490 --> 00:01:05,900
add it to the current commit 

24
00:01:05,900 --> 00:01:07,410
that we''re rebasing. I''m going 

25
00:01:07,410 --> 00:01:09,580
to say --no-edit, to not change 

26
00:01:09,580 --> 00:01:12,060
the message. If I look at the 

27
00:01:12,060 --> 00:01:13,820
instructions, it says I can git 

28
00:01:13,820 --> 00:01:15,410
rebase --continue, so let''s try 

29
00:01:15,410 --> 00:01:17,500
to do that. If we do git rebase --

30
00:01:17,500 --> 00:01:19,920
continue, we''ll get into a merge 

31
00:01:19,920 --> 00:01:22,420
conflict during a rebase. This 

32
00:01:22,720 --> 00:01:24,060
is going to happen if you go 

33
00:01:24,060 --> 00:01:25,930
back in time and change a file 

34
00:01:26,010 --> 00:01:27,290
that also gets changed later, 

35
00:01:27,410 --> 00:01:28,490
which is exactly what happened. 

36
00:01:29,610 --> 00:01:31,830
Let''s take a look. We see both 

37
00:01:31,830 --> 00:01:33,930
modified app.js, so let''s go 

38
00:01:33,930 --> 00:01:36,260
into app.js to change that. Just 

39
00:01:36,260 --> 00:01:37,320
like any other merge conflict, 

40
00:01:37,320 --> 00:01:38,000
we have to clean this up 

41
00:01:38,000 --> 00:01:39,480
manually. There''s no easy way to 

42
00:01:39,480 --> 00:01:41,080
do this. We''re going to get rid 

43
00:01:41,080 --> 00:01:43,210
of the merge conflict lines. We 

44
00:01:43,210 --> 00:01:45,150
have both change2 and the 

45
00:01:45,150 --> 00:01:47,950
change2-inARebase. We just want 

46
00:01:48,160 --> 00:01:49,400
that top one, so we''ll get rid 

47
00:01:49,400 --> 00:01:53,480
of change2. We can save that. 

48
00:01:54,830 --> 00:01:56,990
We have app.js that needs to be 

49
00:01:56,990 --> 00:01:58,640
added, so we can add app.js 

50
00:01:58,640 --> 00:02:01,740
again. We can commit it now with 

51
00:02:01,810 --> 00:02:03,650
a new message that is the, "

52
00:02:03,860 --> 00:02:07,140
Merge rebase changes2 into 

53
00:02:07,880 --> 00:02:11,230
changes3." We could have amended 

54
00:02:11,230 --> 00:02:12,530
the current commit we''re in, or 

55
00:02:12,530 --> 00:02:13,580
we can make a new one like this. 

56
00:02:14,720 --> 00:02:16,830
Then, we can rebase --continue. 

57
00:02:18,720 --> 00:02:20,000
It says we''ve successfully 

58
00:02:20,030 --> 00:02:21,240
rebased all the way to the top. 

59
00:02:21,480 --> 00:02:23,000
Let''s check it out. Let''s do git 

60
00:02:23,000 --> 00:02:26,040
log oneline. We have change1, 

61
00:02:26,040 --> 00:02:28,440
change2. This now is the merge 

62
00:02:28,440 --> 00:02:31,090
commit for both 2 and 3. That is 

63
00:02:31,090 --> 00:02:32,300
a more complicated interactive 

64
00:02:32,300 --> 00:02:34,260
rebase, but it gets us to the 

65
00:02:34,260 --> 00:02:35,560
code that we finally wanted.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# ennter interactive rebase
git rebase -i HEAD~2

# Then we can fix that merge conflict like normal, but finish up the rebase
git rebase --continue
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '9f0ae161', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS/dash/scikit-learn-fix-merge-conflicts-while-changing-commits-during-an-interactive-rebase-By7BYn3nS.mpd', 'https://stream.mux.com/02x2DS01227Yq9JQcU9jMNdVBFtYn5lKQudG018OmXIOe8.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5788, 'Squash Commits Before they are Pushed with Interactive Rebase', NULL, 'We have created 3 commits that we want to squash together before we push them to github.  We can enter an interactive rebase with:

`git rebase -i HEAD~3`

and then change `pick` to `squash` for the last two commits (we want to squash "down" into the first one).

Then we''ll be given the chance to make the commit message for that commit, and once we save the message we''ll be left with just a single commit that contains the changes from all three commits.', 100, NULL, '2019-11-28T11:15:16.898Z', '2025-12-13T00:54:53.678Z', 'git-squash-commits-before-they-are-pushed-with-interactive-rebase', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS.jpg', true, NULL, 'Instructor: [00:00] Let''s take a look at the git log oneline. We can see the three commits that we haven''t pushed yet. Let''s say, instead of having all this history, we just want to push this as one commit to the origin.

[00:13] We can do that with interactive rebase and we can do a git rebase -i, for interactive, and will let you go back three to handle all three of these. We''re going to do HEAD~3 and we want to squash this all together. Our command here is going to be squash or we could also use fixup, but squash lets us re-write the commit message.

[00:35] The idea here is we have to squash new changes down into another change. Let''s enter I for insert mode and instead of pick here, we''re going to squash this down into Change 2. We''re on the squash Change 2 down into Change 1.

[00:50] Notice that these are assorted, so that the top one is the oldest one. We can hit <esc> :wq to save it. Now we are in a new squash merge message.

[01:01] We could leave all this the same if we wanted all of the different messages or we could enter insert mode and delete all of the old messages. We could just say, "This is our new alert change" and hit <esc> :wq to save that.

[01:21] If we do a git status, we have just one commit. If we do git log oneline, we have all three of our commits squashed into one commit that we can then push. If we do a git push now, then all three of our changes have been pushed in one single commit.', NULL, true, '19-egghead-git-squash-commits-before-they-are-pushed-with-interactive-rebase.mp4', 210, true, false, 401, '---
mp4: 12726616
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS.mp4', 'scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS', 'zduF', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS.mp3?554be4c75eb14440?c111', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.460Z', NULL, 8388602, NULL, 7257, 0, NULL, 8388580, 'e81cf9b1e76443019111df4c39f85999', '', 265830, 'free', '', '', '', 'git', '', '', '', NULL, 161222416, '1
00:00:00,860 --> 00:00:02,470
Let''s take a look at the git log 

2
00:00:02,600 --> 00:00:05,000
oneline. We can see the three 

3
00:00:05,000 --> 00:00:06,210
commits that we haven''t pushed 

4
00:00:06,210 --> 00:00:08,090
yet. Let''s say, instead of 

5
00:00:08,090 --> 00:00:09,630
having all this history, we just 

6
00:00:09,630 --> 00:00:11,300
want to push this as one commit 

7
00:00:11,410 --> 00:00:14,070
to the origin. We can do that 

8
00:00:14,070 --> 00:00:16,030
with interactive rebase and we 

9
00:00:16,030 --> 00:00:18,500
can do a git rebase -i, for 

10
00:00:18,500 --> 00:00:20,110
interactive, and will let you go 

11
00:00:20,110 --> 00:00:22,000
back three to handle all three 

12
00:00:22,000 --> 00:00:23,600
of these. We''re going to do HEAD~

13
00:00:23,970 --> 00:00:26,840
3 and we want to squash this all 

14
00:00:26,840 --> 00:00:29,240
together. Our command here is 

15
00:00:29,240 --> 00:00:30,870
going to be squash or we could 

16
00:00:30,870 --> 00:00:33,500
also use fixup, but squash lets 

17
00:00:33,500 --> 00:00:35,150
us re-write the commit message. 

18
00:00:35,970 --> 00:00:36,800
The idea here is we have to 

19
00:00:36,800 --> 00:00:39,430
squash new changes down into 

20
00:00:39,460 --> 00:00:41,490
another change. Let''s enter I 

21
00:00:41,490 --> 00:00:43,290
for insert mode and instead of 

22
00:00:43,320 --> 00:00:44,880
pick here, we''re going to squash 

23
00:00:44,880 --> 00:00:47,320
this down into Change 2. We''re 

24
00:00:47,320 --> 00:00:49,360
on the squash Change 2 down into 

25
00:00:49,360 --> 00:00:51,260
Change 1. Notice that these are 

26
00:00:51,260 --> 00:00:52,890
assorted, so that the top one is 

27
00:00:52,890 --> 00:00:55,910
the oldest one. We can hit <esc> :

28
00:00:56,330 --> 00:00:59,570
wq to save it. Now we are in a 

29
00:00:59,570 --> 00:01:01,680
new squash merge message. We 

30
00:01:01,680 --> 00:01:03,120
could leave all this the same if 

31
00:01:03,120 --> 00:01:04,400
we wanted all of the different 

32
00:01:04,560 --> 00:01:07,040
messages or we could enter 

33
00:01:07,040 --> 00:01:09,130
insert mode and delete all of 

34
00:01:09,130 --> 00:01:12,600
the old messages. We could just 

35
00:01:12,600 --> 00:01:15,960
say, "This is our new alert 

36
00:01:16,080 --> 00:01:20,940
change" and hit <esc> :wq to 

37
00:01:20,940 --> 00:01:22,400
save that. If we do a git 

38
00:01:22,400 --> 00:01:24,950
status, we have just one commit. 

39
00:01:25,460 --> 00:01:28,310
If we do git log oneline, we 

40
00:01:28,310 --> 00:01:30,070
have all three of our commits 

41
00:01:30,140 --> 00:01:31,930
squashed into one commit that we 

42
00:01:31,930 --> 00:01:34,120
can then push. If we do a git 

43
00:01:34,120 --> 00:01:37,030
push now, then all three of our 

44
00:01:37,030 --> 00:01:38,700
changes have been pushed in one 

45
00:01:38,700 --> 00:01:39,390
single commit.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
git rebase -i HEAD~3

# Make the changes in interactive rebase
# Make the commit message for that commit, and once we save the message
# we''ll be left with just a single commit
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '8766e432', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS/dash/scikit-learn-squash-commits-before-they-are-pushed-with-interactive-rebase-ry-0snhhS.mpd', 'https://stream.mux.com/DjoUUFwvQ003UZ4m3JnLJHh8UIz01EsbC1UzkiUZZh7vo.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5789, 'git Ignore a File that has Already been Committed and Pushed', NULL, 'We make a .env file and accidentally push it to github.  

In order to remove the .env file, we first have to add it to our .gitignore file - but that''s not enough, because the .env file will still be on the branch on github.

So we can remove all of our files from our git cache with:

`git rm -r --cached .`

and then add back all the files we want with:

`git add -A`

(that will exclude the .env file this time - because of the .gitignore file).

Then we can commit that change (which is effectively the same as removing the .env file), and push it, which will remove the .env file from the mater branch.

IMPORTANT! If you have secrets in a file that you remove in this way, you should still consider those secrets compromised, because anyone could have pulled them already - and they are also still in the git history.', 157, NULL, '2019-11-28T11:26:42.630Z', '2025-12-13T00:54:53.678Z', 'git-git-ignore-a-file-that-has-already-been-committed-and-pushed', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B.jpg', true, NULL, 'Instructor: [0:00] Let''s make a new environment file, so we''re going to touch .env. Here''s where we might keep some secrets. Let''s go to .env and we''re going to say my value = testing 123 and save that. Then we''re going to add ENV to the staging area and we''ll commit it as adding an ENV file and then we can push that.

[0:28] As soon as we do that, we go to GitHub and we realize that we did not want to push that ENV file. Here it is on our master branch. If anyone pulls this, they''ll have the environment values that we have. Since these are meant to be local environment values, we don''t want that.

[0:46] We quickly go back and we do a touch git ignore and then open git ignore and we''ll add .env and save it. Now, if we do a git status, we have our git ignore here so git add, git ignore and then commit. Ignore the ENV file and push that and push that.

[1:15] If we go check GitHub now and refresh, our ENV is still there, even though we''re now ignoring it because the ENV was pushed before the git ignore. How do we handle that? What we have to do is remove the ENV file from the cache first.

[1:31] We can do git rm -r --cached. What that will do is remove all of our changes and then we can add the files again. Now, if we do git status, then what we''ve effectively done is deleted our ENV file. We could have also git remove our ENV file.

[1:51] This is a way, if you have many, many files that you''re trying to ignore at once, you can remove them all from the cache and then add back just the files you want and then do a status. If we do a commit and say remove.env from remote and then do a push, now if go check GitHub again, the .env file won''t be there.

[2:15] That''s very important that if that .env file had secrets, it''s still going to be right here. In this commit here, we can see that we still have the .env file. Those secrets are still on GitHub. If you push secrets to GitHub, you should just consider them as compromised. This is how you can ignore a file that you have already pushed, even though if you look in the history, that file is still there.', NULL, true, '16-egghead-git-git-ignore-a-file-that-has-already-been-committed-and-pushed.mp4', 210, true, false, 401, '---
mp4: 15461306
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B.mp4', 'scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B', 'zdue', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B.mp3?87378eec8f9142c1?bff4', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.381Z', NULL, 8388602, NULL, 7258, 0, NULL, 8388368, 'a89fa1d195634b28a134f3e44b90ef27', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 161892772, '1
00:00:00,410 --> 00:00:01,870
Let''s make a new environment 

2
00:00:02,040 --> 00:00:03,190
file, so we''re going to touch .

3
00:00:03,790 --> 00:00:06,700
env. Here''s where we might keep 

4
00:00:06,700 --> 00:00:08,250
some secrets. Let''s go to .env 

5
00:00:08,420 --> 00:00:11,390
and we''re going to say my value = 

6
00:00:12,710 --> 00:00:16,390
testing 123 and save that. Then 

7
00:00:16,390 --> 00:00:17,920
we''re going to add ENV to the 

8
00:00:17,920 --> 00:00:19,730
staging area and we''ll commit it 

9
00:00:20,070 --> 00:00:24,670
as adding an ENV file and then 

10
00:00:24,670 --> 00:00:28,800
we can push that. As soon as we 

11
00:00:28,800 --> 00:00:31,440
do that, we go to GitHub and we 

12
00:00:31,440 --> 00:00:33,860
realize that we did not want to 

13
00:00:33,860 --> 00:00:35,990
push that ENV file. Here it is 

14
00:00:36,050 --> 00:00:38,670
on our master branch. If anyone 

15
00:00:38,670 --> 00:00:39,920
pulls this, they''ll have the 

16
00:00:39,920 --> 00:00:42,070
environment values that we have. 

17
00:00:42,070 --> 00:00:43,360
Since these are meant to be 

18
00:00:43,360 --> 00:00:44,720
local environment values, we 

19
00:00:44,770 --> 00:00:48,020
don''t want that. We quickly go 

20
00:00:48,020 --> 00:00:49,940
back and we do a touch git 

21
00:00:49,940 --> 00:00:53,620
ignore and then open git ignore 

22
00:00:54,290 --> 00:00:57,010
and we''ll add .env and save it. 

23
00:00:58,520 --> 00:01:00,560
Now, if we do a git status, we 

24
00:01:00,560 --> 00:01:02,060
have our git ignore here so git 

25
00:01:02,120 --> 00:01:06,350
add, git ignore and then commit. 

26
00:01:07,540 --> 00:01:10,960
Ignore the ENV file and push 

27
00:01:10,960 --> 00:01:15,930
that and push that. If we go 

28
00:01:15,930 --> 00:01:17,680
check GitHub now and refresh, 

29
00:01:18,290 --> 00:01:20,460
our ENV is still there, even 

30
00:01:20,460 --> 00:01:21,690
though we''re now ignoring it 

31
00:01:22,330 --> 00:01:23,470
because the ENV was pushed 

32
00:01:23,540 --> 00:01:25,570
before the git ignore. How do we 

33
00:01:25,570 --> 00:01:27,680
handle that? What we have to do 

34
00:01:27,770 --> 00:01:30,070
is remove the ENV file from the 

35
00:01:30,180 --> 00:01:32,130
cache first. We can do git rm -

36
00:01:32,530 --> 00:01:37,280
r --cached. What that will do is 

37
00:01:37,280 --> 00:01:39,510
remove all of our changes and 

38
00:01:39,510 --> 00:01:41,420
then we can add the files again. 

39
00:01:42,600 --> 00:01:44,900
Now, if we do git status, then 

40
00:01:44,900 --> 00:01:46,320
what we''ve effectively done is 

41
00:01:46,320 --> 00:01:48,210
deleted our ENV file. We could 

42
00:01:48,210 --> 00:01:50,060
have also git remove our ENV 

43
00:01:50,180 --> 00:01:52,090
file. This is a way, if you 

44
00:01:52,090 --> 00:01:53,630
have many, many files that 

45
00:01:53,630 --> 00:01:54,800
you''re trying to ignore at once, 

46
00:01:54,920 --> 00:01:56,020
you can remove them all from the 

47
00:01:56,020 --> 00:01:58,540
cache and then add back just the 

48
00:01:58,540 --> 00:01:59,850
files you want and then do a 

49
00:01:59,850 --> 00:02:02,610
status. If we do a commit and 

50
00:02:02,610 --> 00:02:06,500
say remove.env from remote and 

51
00:02:06,500 --> 00:02:09,950
then do a push, now if go check 

52
00:02:10,030 --> 00:02:13,480
GitHub again, the .env file 

53
00:02:13,480 --> 00:02:15,590
won''t be there. That''s very 

54
00:02:15,590 --> 00:02:17,370
important that if that .env file 

55
00:02:17,370 --> 00:02:19,620
had secrets, it''s still going to 

56
00:02:19,620 --> 00:02:21,050
be right here. In this commit 

57
00:02:21,050 --> 00:02:23,430
here, we can see that we still 

58
00:02:23,430 --> 00:02:25,430
have the .env file. Those 

59
00:02:25,430 --> 00:02:27,990
secrets are still on GitHub. If 

60
00:02:27,990 --> 00:02:29,250
you push secrets to GitHub, you 

61
00:02:29,250 --> 00:02:30,200
should just consider them as 

62
00:02:30,200 --> 00:02:32,560
compromised. This is how you can 

63
00:02:32,560 --> 00:02:33,680
ignore a file that you have 

64
00:02:33,680 --> 00:02:35,260
already pushed, even though if 

65
00:02:35,260 --> 00:02:36,170
you look in the history, that 

66
00:02:36,170 --> 00:02:37,160
file is still there.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# We make a file and accidentally push it to github
# To remove it, add it to .gitignore file
# remove all of our files from our git cache
git rm -r --cached .

# add back all the files we want with
git add -A
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'de83f544', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B/dash/scikit-learn-git-ignore-a-file-that-has-already-been-committed-and-pushed-HyJF0222B.mpd', 'https://stream.mux.com/gSepM5OipZAJou1kiYlGmZzBwesn1KRwf02j11vkugCA.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5790, 'Completely Remove a File from Pushed git History', NULL, 'If we want to completely remove a file from github - including all history - there is a tool that we can use called the BFG.

The github help article is here:

https://help.github.com/en/github/authenticating-to-github/removing-sensitive-data-from-a-repository

And the BGF itself is available here:

https://rtyley.github.io/bfg-repo-cleaner/

We''ll start by downloading the BFG jar file, and then cloning a mirror of our repo with:

`git clone --mirror [repo-url]`

Then we can delete our .env file with:

`java -jar ~/Downloads/bfg-1.13.0.jar --delete-files .env my-repo.git`

which will delete the .env file. Then we can use the following command to prune the entire history and garbage collect the remains:

`git reflog expire --expire=now --all && git gc --prune=now --aggressive`

And finally, use `git push` to push that change to github, and remove the .env file from all of the history on github as well.', 192, NULL, '2019-11-28T11:45:16.842Z', '2025-12-13T00:54:53.678Z', 'git-completely-remove-a-file-from-pushed-git-history', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH.jpg', true, NULL, 'Instructor: [00:00] We pushed a .env file with a secret here and we want to really scrub this from the git repo. There is one nuclear option that we could do, although you should still consider any secret you push to GitHub as lost or compromised and changed it.

[00:16] If we go to this GitHub help article and the link is in the description, it has this BFG repo cleaner, which will be able to delete files in the repo and all of the repo''s history. Let''s go to that tool here and see how to use this for out .env file.

[00:34] First, we have to download the JAR file and tell Chrome we want to keep it. We have to follow the instructions in the usage section. Let''s do that. First, we''re going to go up one directory and we''re going to make a new directory and I''ll call it clean up, but you can call it whatever you like. I''ll see the enter clean up.

[00:56] Now, I need to git clone as a mirror my repository. Let''s go back to GitHub, back to my repository and get the URL for it. When I''m cloning as a mirror, what the BFG tool is going to do is delete the history locally and then when we push to GitHub, GitHub won''t mirror our new re-written histories.

[01:19] Let''s look at LS and we have just the gitMistakes.gitDirectory. What we''re going to do is look at the instructions and use the delete files command. Because it''s a JAR file, we have to run it with java-jar. Let''s do java-jar and mine went to the downloads directory under bfg.jar.

[01:45] I want to --delete files, the files I want in my repository. I''m going to do --delete files. I want to delete the .env file in the gitMistakes.gitRepository. We can see that it did that and now the instructions. The files are deleted, but now I need to strip that file from the history.

[02:08] I''m going to copy this exact command. First, we''re going to see into the repository. Then we''re going to use ref log to do a garbage collection of all the history of that file. I''m going to look and see into git mistakes and I''m going to copy and paste that line and it send it''s done cleaning the objects.

[02:28] Now I can do a git push. What happened is the BFG rewrote the history locally and then we''re pushing it up to GitHub. It doesn''t work on the pull request here, but that''s OK because our environment was in master.

[02:42] If we look at GitHub now, we can go to get mistakes and if we look at the commit history, here''s where it says we added the ENV file. If we look at the files in that commit, we can see that is showing zero changes with zero additions or deletions.

[03:00] We''ve successfully removed this file completely from GitHub. Again, if you have secrets in that file, consider them compromised at this point, but this is how we can actually clean up GitHub history.', NULL, true, '20-egghead-git-completely-remove-a-file-from-pushed-git-history.mp4', 210, true, false, 401, '---
mp4: 20592088
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH.mp4', 'scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH', 'zdu6', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH.mp3?3acb224613179f2c?5ae7', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.247Z', NULL, 8388602, NULL, 7259, 0, NULL, 8388596, '6b82ceef82644fa6be02eb83e3940d09', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 162563128, '1
00:00:00,420 --> 00:00:02,730
We pushed a .env file with a 

2
00:00:02,730 --> 00:00:04,460
secret here and we want to 

3
00:00:04,460 --> 00:00:06,270
really scrub this from the git 

4
00:00:06,270 --> 00:00:09,100
repo. There is one nuclear 

5
00:00:09,100 --> 00:00:10,080
option that we could do, 

6
00:00:10,540 --> 00:00:11,250
although you should still 

7
00:00:11,250 --> 00:00:12,710
consider any secret you push to 

8
00:00:12,710 --> 00:00:14,700
GitHub as lost or compromised 

9
00:00:14,860 --> 00:00:17,080
and changed it. If we go to 

10
00:00:17,290 --> 00:00:18,760
this GitHub help article and the 

11
00:00:18,760 --> 00:00:20,810
link is in the description, it 

12
00:00:20,810 --> 00:00:23,680
has this BFG repo cleaner, which 

13
00:00:23,680 --> 00:00:25,730
will be able to delete files in 

14
00:00:25,730 --> 00:00:27,560
the repo and all of the repo''s 

15
00:00:27,560 --> 00:00:30,660
history. Let''s go to that tool 

16
00:00:30,660 --> 00:00:33,470
here and see how to use this for 

17
00:00:33,510 --> 00:00:35,240
out .env file. First, we have 

18
00:00:35,240 --> 00:00:38,510
to download the JAR file and 

19
00:00:38,540 --> 00:00:40,820
tell Chrome we want to keep it. 

20
00:00:40,880 --> 00:00:41,970
We have to follow the 

21
00:00:41,970 --> 00:00:43,470
instructions in the usage 

22
00:00:43,510 --> 00:00:46,450
section. Let''s do that. First, 

23
00:00:46,450 --> 00:00:47,360
we''re going to go up one 

24
00:00:47,360 --> 00:00:49,090
directory and we''re going to 

25
00:00:49,090 --> 00:00:52,130
make a new directory and I''ll 

26
00:00:52,130 --> 00:00:53,010
call it clean up, but you can 

27
00:00:53,010 --> 00:00:54,540
call it whatever you like. I''ll 

28
00:00:54,540 --> 00:00:56,700
see the enter clean up. Now, I 

29
00:00:56,700 --> 00:01:00,360
need to git clone as a mirror my 

30
00:01:00,360 --> 00:01:01,960
repository. Let''s go back to 

31
00:01:01,960 --> 00:01:04,730
GitHub, back to my repository 

32
00:01:04,800 --> 00:01:08,630
and get the URL for it. When I''m 

33
00:01:08,630 --> 00:01:10,190
cloning as a mirror, what the 

34
00:01:10,190 --> 00:01:11,850
BFG tool is going to do is 

35
00:01:11,960 --> 00:01:13,160
delete the history locally and 

36
00:01:13,460 --> 00:01:14,620
then when we push to GitHub, 

37
00:01:14,820 --> 00:01:16,910
GitHub won''t mirror our new re-

38
00:01:16,910 --> 00:01:20,250
written histories. Let''s look 

39
00:01:20,250 --> 00:01:22,000
at LS and we have just the 

40
00:01:22,000 --> 00:01:25,990
gitMistakes.gitDirectory. What 

41
00:01:25,990 --> 00:01:27,630
we''re going to do is look at the 

42
00:01:27,630 --> 00:01:29,510
instructions and use the delete 

43
00:01:29,510 --> 00:01:31,980
files command. Because it''s a 

44
00:01:31,980 --> 00:01:33,560
JAR file, we have to run it with 

45
00:01:33,650 --> 00:01:38,740
java-jar. Let''s do java-jar and 

46
00:01:38,740 --> 00:01:40,120
mine went to the downloads 

47
00:01:40,120 --> 00:01:45,990
directory under bfg.jar. I want 

48
00:01:45,990 --> 00:01:48,810
to --delete files, the files I 

49
00:01:48,810 --> 00:01:50,770
want in my repository. I''m going 

50
00:01:50,770 --> 00:01:53,660
to do --delete files. I want to 

51
00:01:53,660 --> 00:01:56,230
delete the .env file in the 

52
00:01:56,360 --> 00:02:00,650
gitMistakes.gitRepository. We 

53
00:02:00,650 --> 00:02:03,230
can see that it did that and now 

54
00:02:03,230 --> 00:02:05,480
the instructions. The files are 

55
00:02:05,480 --> 00:02:06,940
deleted, but now I need to strip 

56
00:02:06,940 --> 00:02:08,850
that file from the history. I''m 

57
00:02:08,850 --> 00:02:11,010
going to copy this exact command. 

58
00:02:11,010 --> 00:02:12,180
First, we''re going to see into 

59
00:02:12,180 --> 00:02:13,840
the repository. Then we''re going 

60
00:02:13,840 --> 00:02:16,060
to use ref log to do a garbage 

61
00:02:16,060 --> 00:02:18,060
collection of all the history of 

62
00:02:18,060 --> 00:02:20,660
that file. I''m going to look and 

63
00:02:20,660 --> 00:02:22,770
see into git mistakes and I''m 

64
00:02:22,770 --> 00:02:24,050
going to copy and paste that 

65
00:02:24,050 --> 00:02:27,090
line and it send it''s done 

66
00:02:27,090 --> 00:02:28,990
cleaning the objects. Now I can 

67
00:02:28,990 --> 00:02:32,460
do a git push. What happened is 

68
00:02:32,460 --> 00:02:34,200
the BFG rewrote the history 

69
00:02:34,200 --> 00:02:35,890
locally and then we''re pushing 

70
00:02:35,890 --> 00:02:38,080
it up to GitHub. It doesn''t work 

71
00:02:38,080 --> 00:02:39,480
on the pull request here, but 

72
00:02:39,480 --> 00:02:40,470
that''s OK because our 

73
00:02:40,470 --> 00:02:42,440
environment was in master. If 

74
00:02:42,620 --> 00:02:45,440
we look at GitHub now, we can go 

75
00:02:45,440 --> 00:02:48,090
to get mistakes and if we look 

76
00:02:48,120 --> 00:02:50,620
at the commit history, here''s 

77
00:02:50,620 --> 00:02:51,940
where it says we added the ENV 

78
00:02:52,040 --> 00:02:54,210
file. If we look at the files in 

79
00:02:54,210 --> 00:02:56,610
that commit, we can see that is 

80
00:02:56,610 --> 00:02:58,270
showing zero changes with zero 

81
00:02:58,270 --> 00:03:00,330
additions or deletions. We''ve 

82
00:03:00,330 --> 00:03:02,360
successfully removed this file 

83
00:03:02,360 --> 00:03:04,680
completely from GitHub. Again, 

84
00:03:04,800 --> 00:03:06,090
if you have secrets in that file, 

85
00:03:06,160 --> 00:03:07,240
consider them compromised at 

86
00:03:07,240 --> 00:03:09,150
this point, but this is how we 

87
00:03:09,150 --> 00:03:10,820
can actually clean up GitHub 

88
00:03:10,895 --> 00:03:11,220
history.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, '```bash
# prune the entire history and garbage collect the remains
git reflog expire --expire=now --all && git gc --prune=now --aggressive

#  use git push to push that change to github,
# and remove the .env file from all of the history
```

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', '917b5d15', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH/dash/scikit-learn-completely-remove-a-file-from-pushed-git-history-BkKRzTnnH.mpd', 'https://stream.mux.com/H33BWgr301k00TMD6qF7kh8tIpvLzFtCm01thzGPcKUHQM.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO lessons (id, title, youtube_id, summary, duration, position, created_at, updated_at, slug, ascii, wistia_id, thumb_url, published, embed_markup, transcript, wistia_embed_meta, is_pro_content, aws_filename, instructor_id, can_count_views, full_source_download, series_id, file_sizes, display_id, rss_url, title_url, casting_words_order, audio_url, plays_count, github_repo, repo_tag, jsbin_url, codepen_id, git_branch, tweeted_on, state, published_at, publish_at, row_order, github_user, current_lesson_version_id, difficulty_rating, retired_at, series_row_order, assembly_id, plunker_url, creator_id, cached_tag_list, cached_library_list, cached_language_list, cached_framework_list, cached_tool_list, cached_platform_list, cached_skillset_list, cached_skill_level_list, gist_url, popularity_order, srt, free_forever, old_technology, visibility_state, square_cover_file_name, square_cover_content_type, square_cover_file_size, square_cover_updated_at, square_cover_processing, site, code_url, notes, resource_type, guid, current_video_dash_url, current_video_hls_url, staff_notes_url, revenue_share_instructor_id) VALUES (5791, 'Push a New Branch to github that Doesn''t Exist Remotely Yet', NULL, 'We''ll make a new feature branch with:

`git checkout -b new-branch`

and then when we make changes and commit them, we can try to push that branch with:

`git push`

However, in order to get the branch to exist on github as well, we need to set the upstream of the local branch at the same time with:

`git push --set-upstream origin new-branch`', 117, NULL, '2019-11-28T11:50:59.277Z', '2025-12-13T00:54:53.678Z', 'git-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet', NULL, NULL, 'https://dcv19h61vib2d.cloudfront.net/thumbs/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB.jpg', true, NULL, 'Instructor: [0:00] We can create a new branch in two different ways. We can do git branch and then our branch name like jsChanges or we can do git checkout -b jsChanges. That''s what we''ll do to make a new branch. If we do a git status, we can see that we''re on the branch jsChanges.

[0:20] We can also do git branch to see all of our branches. If we do git branch -vv, for verbose mode, then we can see the current commit that we''re on for each branch, and we can see the remote that we''re on for each branch. Master is linked to a remote, but jsChanges is just a local branch for now.

[0:42] Let''s make a change on this branch. We''ll make a function called helloWorld again, and we can say alert i. Then, let''s save that and do a git status. Now our app.js has been modified. Let''s add app.js to the staging area. We''ll commit that and we''ll say, "Adds Hello World."

[1:06] If we do a git log oneline, then we have "Adds Hello World" on the jsChanges branch, which has diverged from the master branch. Let''s push that. When we do, we get a fatal error, because if we do git branch -vv, we don''t have jsChanges linked to any remote branch.

[1:29] Luckily, we have the fix right here. We have to push while setting the upstream to the origin jsChanges, just like this is origin master. Let''s do git push. We can do --set-upstream or we can do -u, and then origin jsChanges. Now that has been pushed. If we do git branch -vv again, we can see that jsChanges is now mapped to origin jsChanges.', NULL, true, '08-egghead-git-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet.mp4', 210, true, false, 401, '---
mp4: 10733361
', NULL, 'https://d3cxrxf04bhbwz.cloudfront.net/lessons/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB.mp4', 'scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB', 'zduT', 'https://egghead-pipeline.s3.amazonaws.com/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB.mp3?4046059910455b5c?5756', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'published', '2019-12-12T02:34:04.519Z', NULL, 8388602, NULL, 7260, 0, NULL, 8265728, '91028b0e784a47b8a2bc1b31035065e1', NULL, 265830, 'free', '', '', '', 'git', 'github', '', '', NULL, 163233484, '1
00:00:00,230 --> 00:00:01,710
We can create a new branch in 

2
00:00:01,710 --> 00:00:03,010
two different ways. We can do 

3
00:00:03,010 --> 00:00:05,390
git branch and then our branch 

4
00:00:05,470 --> 00:00:08,800
name like jsChanges or we can do 

5
00:00:08,800 --> 00:00:12,310
git checkout -b jsChanges. 

6
00:00:12,930 --> 00:00:13,790
That''s what we''ll do to make a 

7
00:00:13,790 --> 00:00:15,810
new branch. If we do a git 

8
00:00:15,810 --> 00:00:18,120
status, we can see that we''re on 

9
00:00:18,120 --> 00:00:20,430
the branch jsChanges. We can 

10
00:00:20,430 --> 00:00:22,290
also do git branch to see all of 

11
00:00:22,290 --> 00:00:24,310
our branches. If we do git 

12
00:00:24,360 --> 00:00:28,090
branch -vv, for verbose mode, 

13
00:00:28,850 --> 00:00:30,840
then we can see the current 

14
00:00:31,430 --> 00:00:32,520
commit that we''re on for each 

15
00:00:32,560 --> 00:00:33,980
branch, and we can see the 

16
00:00:34,030 --> 00:00:35,750
remote that we''re on for each 

17
00:00:35,750 --> 00:00:37,650
branch. Master is linked to a 

18
00:00:37,650 --> 00:00:39,820
remote, but jsChanges is just a 

19
00:00:39,820 --> 00:00:42,330
local branch for now. Let''s 

20
00:00:42,330 --> 00:00:43,670
make a change on this branch. 

21
00:00:44,110 --> 00:00:45,980
We''ll make a function called 

22
00:00:46,080 --> 00:00:48,680
helloWorld again, and we can say 

23
00:00:48,700 --> 00:00:52,420
alert i. Then, let''s save that 

24
00:00:52,590 --> 00:00:55,560
and do a git status. Now our app.

25
00:00:55,560 --> 00:00:57,860
js has been modified. Let''s add 

26
00:00:58,040 --> 00:00:59,740
app.js to the staging area. 

27
00:01:00,520 --> 00:01:02,700
We''ll commit that and we''ll say, "

28
00:01:03,320 --> 00:01:07,330
Adds Hello World." If we do a 

29
00:01:07,330 --> 00:01:11,220
git log oneline, then we have "

30
00:01:11,260 --> 00:01:13,250
Adds Hello World" on the 

31
00:01:13,250 --> 00:01:14,510
jsChanges branch, which has 

32
00:01:14,540 --> 00:01:16,220
diverged from the master branch. 

33
00:01:16,810 --> 00:01:19,300
Let''s push that. When we do, we 

34
00:01:19,300 --> 00:01:21,860
get a fatal error, because if we 

35
00:01:21,860 --> 00:01:25,810
do git branch -vv, we don''t have 

36
00:01:25,870 --> 00:01:28,360
jsChanges linked to any remote 

37
00:01:28,440 --> 00:01:30,420
branch. Luckily, we have the 

38
00:01:30,420 --> 00:01:32,310
fix right here. We have to push 

39
00:01:32,310 --> 00:01:34,270
while setting the upstream to 

40
00:01:34,570 --> 00:01:36,860
the origin jsChanges, just like 

41
00:01:36,860 --> 00:01:38,660
this is origin master. Let''s do 

42
00:01:38,660 --> 00:01:40,530
git push. We can do --set-

43
00:01:40,590 --> 00:01:44,310
upstream or we can do -u, and 

44
00:01:44,310 --> 00:01:48,920
then origin jsChanges. Now that 

45
00:01:48,920 --> 00:01:50,380
has been pushed. If we do git 

46
00:01:50,550 --> 00:01:53,710
branch -vv again, we can see 

47
00:01:53,710 --> 00:01:56,010
that jsChanges is now mapped to 

48
00:01:56,040 --> 00:01:56,880
origin jsChanges.

', false, NULL, 'indexed', NULL, NULL, NULL, NULL, NULL, 'egghead.io', NULL, 'We can create branches with `git branch {BRANCH-NAME}` or `git checkout -b {BRANCH-NAME}`. Let''s create one called `js-changes` with `git checkout -b js-changes`. Using `git status` shows you which branch you''re currently on and `git branch -vv` shows the current commit and remote you''re on for each branch. We can make a change on the branch by creating a function in our `app.js`.

## app.js
```js
// our app js code

function helloWorld() {
  alert("Hi!")
}
```

After saving, we stage the file with `git add app.js` and a commit message `git commit -m "Adds hello world"`. Using the `git log --oneline` shows that we have diverged from the master branch. If we tried to push at this point, we would receive a fatal error. Using `git branch -vv` displays we don''t have `js-changes` linked to any remote branch. However, Git gives us the fix in the terminal. We have to push while setting the upstream to `origin js-changes`. **We then run `git push -u origin js-changes` to push it, as `-u` is just an alternative to `--set-upstream`.** Now, we successfully pushed our new branch to Github and trying `git branch -vv` can show us that the old `js-changes` is now mapped to `origin/js-changes`.

[✏️ Edit on GitHub](https://github.com/eggheadio/eggheadio-course-notes/tree/master/fix-common-git-mistakes/notes)', 'lesson', 'dec0444a', 'https://d2c5owlt6rorc3.cloudfront.net/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB/dash/scikit-learn-push-a-new-branch-to-github-that-doesn-t-exist-remotely-yet-SkgE4a2hB.mpd', 'https://stream.mux.com/Bc8y7Qxqmjj2h2J7LuLGWCcJE01PLzUXbcjUFIWdRLIQ.m3u8', NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Tags (3)
INSERT INTO tags (id, name, taggings_count, image_file_name, image_content_type, image_file_size, image_updated_at, slug, description, url, label, popularity_order, updated_at, context) VALUES (276, 'github', 103, 'github_logo.png', 'image/png', 17397, '2018-08-14T01:33:01.708Z', 'github', 'GitHub fosters a fast, flexible, and collaborative development process that lets you work on your own or with others.', 'https://github.com/', 'GitHub', 175591192, '2022-02-02T02:22:32.475Z', 'topics') ON CONFLICT (id) DO NOTHING;
INSERT INTO tags (id, name, taggings_count, image_file_name, image_content_type, image_file_size, image_updated_at, slug, description, url, label, popularity_order, updated_at, context) VALUES (638, 'git', 115, 'gitlogo.png', 'image/png', 93239, '2018-08-14T01:33:01.730Z', 'git', 'Git is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.', 'https://git-scm.com/', 'git', 182078130, '2022-02-02T02:22:32.830Z', 'topics') ON CONFLICT (id) DO NOTHING;
INSERT INTO tags (id, name, taggings_count, image_file_name, image_content_type, image_file_size, image_updated_at, slug, description, url, label, popularity_order, updated_at, context) VALUES (21, 'free', 5429, NULL, NULL, NULL, NULL, 'free', NULL, NULL, 'free', 239982734, '2021-01-04T19:15:37.251Z', NULL) ON CONFLICT (id) DO NOTHING;

-- Taggings (48)
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33967, 21, 5765, 'Lesson', NULL, NULL, 'tags', '2019-11-28T03:51:13.534Z', '2019-11-28T03:51:13.534Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33968, 638, 5765, 'Lesson', NULL, NULL, 'tools', '2019-11-28T03:55:33.622Z', '2019-11-28T03:55:33.622Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33969, 276, 5765, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T03:55:36.948Z', '2019-11-28T03:55:36.948Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33970, 21, 5766, 'Lesson', NULL, NULL, 'tags', '2019-11-28T04:15:24.610Z', '2019-11-28T04:15:24.610Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33971, 638, 5766, 'Lesson', NULL, NULL, 'tools', '2019-11-28T04:15:58.741Z', '2019-11-28T04:15:58.741Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33979, 21, 5770, 'Lesson', NULL, NULL, 'tags', '2019-11-28T05:32:39.044Z', '2019-11-28T05:32:39.044Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33980, 638, 5770, 'Lesson', NULL, NULL, 'tools', '2019-11-28T05:33:12.545Z', '2019-11-28T05:33:12.545Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33983, 21, 5772, 'Lesson', NULL, NULL, 'tags', '2019-11-28T06:00:18.607Z', '2019-11-28T06:00:18.607Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33984, 638, 5772, 'Lesson', NULL, NULL, 'tools', '2019-11-28T06:01:02.966Z', '2019-11-28T06:01:02.966Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33986, 21, 5773, 'Lesson', NULL, NULL, 'tags', '2019-11-28T06:11:41.541Z', '2019-11-28T06:11:41.541Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33987, 638, 5773, 'Lesson', NULL, NULL, 'tools', '2019-11-28T06:12:27.095Z', '2019-11-28T06:12:27.095Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33989, 21, 5774, 'Lesson', NULL, NULL, 'tags', '2019-11-28T06:29:43.317Z', '2019-11-28T06:29:43.317Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33990, 638, 5774, 'Lesson', NULL, NULL, 'tools', '2019-11-28T06:30:14.775Z', '2019-11-28T06:30:14.775Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33992, 21, 5776, 'Lesson', NULL, NULL, 'tags', '2019-11-28T06:36:27.339Z', '2019-11-28T06:36:27.339Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (33993, 638, 5776, 'Lesson', NULL, NULL, 'tools', '2019-11-28T06:36:58.930Z', '2019-11-28T06:36:58.930Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34001, 21, 5779, 'Lesson', NULL, NULL, 'tags', '2019-11-28T07:49:38.045Z', '2019-11-28T07:49:38.045Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (32744, 638, 401, 'Series', NULL, NULL, 'tools', '2019-11-06T04:25:07.242Z', '2019-11-06T04:25:07.242Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34002, 638, 5779, 'Lesson', NULL, NULL, 'tools', '2019-11-28T07:50:09.551Z', '2019-11-28T07:50:09.551Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34004, 21, 5780, 'Lesson', NULL, NULL, 'tags', '2019-11-28T07:59:39.899Z', '2019-11-28T07:59:39.899Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34005, 638, 5780, 'Lesson', NULL, NULL, 'tools', '2019-11-28T08:00:23.523Z', '2019-11-28T08:00:23.523Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34006, 21, 5781, 'Lesson', NULL, NULL, 'tags', '2019-11-28T08:46:01.378Z', '2019-11-28T08:46:01.378Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34007, 638, 5781, 'Lesson', NULL, NULL, 'tools', '2019-11-28T08:46:52.005Z', '2019-11-28T08:46:52.005Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34008, 276, 5781, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T08:46:54.832Z', '2019-11-28T08:46:54.832Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34009, 21, 5782, 'Lesson', NULL, NULL, 'tags', '2019-11-28T08:51:33.187Z', '2019-11-28T08:51:33.187Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34010, 638, 5782, 'Lesson', NULL, NULL, 'tools', '2019-11-28T08:52:01.342Z', '2019-11-28T08:52:01.342Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34011, 21, 5783, 'Lesson', NULL, NULL, 'tags', '2019-11-28T10:01:34.849Z', '2019-11-28T10:01:34.849Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34012, 638, 5783, 'Lesson', NULL, NULL, 'tools', '2019-11-28T10:02:15.555Z', '2019-11-28T10:02:15.555Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34013, 276, 5783, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T10:02:19.262Z', '2019-11-28T10:02:19.262Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34014, 21, 5784, 'Lesson', NULL, NULL, 'tags', '2019-11-28T10:21:16.538Z', '2019-11-28T10:21:16.538Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34015, 638, 5784, 'Lesson', NULL, NULL, 'tools', '2019-11-28T10:22:33.526Z', '2019-11-28T10:22:33.526Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34016, 276, 5784, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T10:22:35.613Z', '2019-11-28T10:22:35.613Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34017, 21, 5785, 'Lesson', NULL, NULL, 'tags', '2019-11-28T10:46:29.456Z', '2019-11-28T10:46:29.456Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34018, 638, 5785, 'Lesson', NULL, NULL, 'tools', '2019-11-28T10:47:12.666Z', '2019-11-28T10:47:12.666Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34019, 21, 5786, 'Lesson', NULL, NULL, 'tags', '2019-11-28T10:56:21.286Z', '2019-11-28T10:56:21.286Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34020, 638, 5786, 'Lesson', NULL, NULL, 'tools', '2019-11-28T10:57:01.743Z', '2019-11-28T10:57:01.743Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34021, 21, 5787, 'Lesson', NULL, NULL, 'tags', '2019-11-28T11:04:25.465Z', '2019-11-28T11:04:25.465Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34022, 638, 5787, 'Lesson', NULL, NULL, 'tools', '2019-11-28T11:05:10.960Z', '2019-11-28T11:05:10.960Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34023, 21, 5788, 'Lesson', NULL, NULL, 'tags', '2019-11-28T11:15:18.804Z', '2019-11-28T11:15:18.804Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34035, 276, 5791, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T11:51:40.306Z', '2019-11-28T11:51:40.306Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34024, 638, 5788, 'Lesson', NULL, NULL, 'tools', '2019-11-28T11:16:26.661Z', '2019-11-28T11:16:26.661Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34027, 276, 5789, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T11:27:26.990Z', '2019-11-28T11:27:26.990Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34025, 21, 5789, 'Lesson', NULL, NULL, 'tags', '2019-11-28T11:26:45.145Z', '2019-11-28T11:26:45.145Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34026, 638, 5789, 'Lesson', NULL, NULL, 'tools', '2019-11-28T11:27:25.294Z', '2019-11-28T11:27:25.294Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34030, 21, 5790, 'Lesson', NULL, NULL, 'tags', '2019-11-28T11:45:18.616Z', '2019-11-28T11:45:18.616Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34033, 21, 5791, 'Lesson', NULL, NULL, 'tags', '2019-11-28T11:51:01.470Z', '2019-11-28T11:51:01.470Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34031, 638, 5790, 'Lesson', NULL, NULL, 'tools', '2019-11-28T11:46:03.652Z', '2019-11-28T11:46:03.652Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34032, 276, 5790, 'Lesson', NULL, NULL, 'platforms', '2019-11-28T11:46:05.645Z', '2019-11-28T11:46:05.645Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, context, created_at, updated_at) VALUES (34034, 638, 5791, 'Lesson', NULL, NULL, 'tools', '2019-11-28T11:51:38.045Z', '2019-11-28T11:51:38.045Z') ON CONFLICT (id) DO NOTHING;


-- Re-enable FK checks
SET session_replication_role = DEFAULT;

-- Reset sequences
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('instructors_id_seq', COALESCE((SELECT MAX(id) FROM instructors), 1));
SELECT setval('series_id_seq', COALESCE((SELECT MAX(id) FROM series), 1));
SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1));
SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 1));
SELECT setval('taggings_id_seq', COALESCE((SELECT MAX(id) FROM taggings), 1));