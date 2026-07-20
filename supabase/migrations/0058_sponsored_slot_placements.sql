-- Remplace les 2 emplacements initiaux (home_feed marchait vraiment, subject n'avait jamais été
-- branché sur une vraie page) par les 7 endroits réels de l'app où une annonce peut apparaître :
-- le fil d'accueil, les 3 listes de documents (cours/épreuves/fiches), la liste du forum, et les
-- deux pages de détail (document précis, sujet de forum précis).
alter table sponsored_slots drop constraint sponsored_slots_placement_check;
alter table sponsored_slots add constraint sponsored_slots_placement_check
  check (placement in (
    'home_feed',
    'courses_list',
    'exams_list',
    'revision_sheets_list',
    'forum_list',
    'document_detail',
    'topic_detail'
  ));
