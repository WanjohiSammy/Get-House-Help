-- Demo data for trying MtaaCare on your computer. Safe to run more than once.
-- Never run this on your live database.
INSERT OR IGNORE INTO helps (id,name,phone,area,lat,lng,kinds,tasks,years,languages,salary,about,id_verified,good_conduct,refs_called,interviewed,certified,status,added_by,created_at,updated_at) VALUES
 ('g1','Grace Akinyi','254712345678','Kawangware',-1.284,36.751,'live-in,live-out','cleaning,cooking,children,baby',7,'Kiswahili, English, Dholuo',19000,'I have looked after children from newborn to school age for seven years. I cook Kenyan and simple continental meals.',1,1,1,1,1,'approved','Admin','2026-11-19T08:00:00Z','2026-11-19T08:00:00Z'),
 ('m1','Mary Wanjiru','254722111222','Kangemi',NULL,NULL,'live-in','cleaning,laundry,children',4,'Kiswahili, Kikuyu',18500,'Hard-working and organised. Four years with one family in Westlands.',1,1,1,1,0,'approved','Admin','2026-11-19T08:00:00Z','2026-11-19T08:00:00Z'),
 ('e1','Esther Nduta','254733111222','Riruta',NULL,NULL,'live-in,live-out','cleaning,cooking,elderly',10,'Kiswahili, English',20000,'Ten years of experience including caring for an elderly grandmother.',1,1,1,0,0,'approved','Admin','2026-11-19T08:00:00Z','2026-11-19T08:00:00Z');
INSERT OR IGNORE INTO helps (id,name,phone,area,kinds,tasks,years,languages,salary,about,ref1_name,ref1_phone,ref2_name,ref2_phone,status,added_by,created_at,updated_at) VALUES
 ('p1','Ruth Atieno','254799888777','Kibera','live-in,live-out','cleaning,cooking,children',3,'Kiswahili, Dholuo',18500,'','Mrs Wambui','254711000001','Mr Otieno','254711000002','pending','self','2026-11-19T09:00:00Z','2026-11-19T09:00:00Z');
INSERT INTO vetting_events (help_id, step, slot, result, notes, data, by_name, created_at)
 SELECT 'g1','id_check',0,'pass','','{"sawOriginal":true,"nameMatches":true,"over18":true}','Admin','2026-11-19T08:00:00Z'
 WHERE NOT EXISTS (SELECT 1 FROM vetting_events WHERE help_id = 'g1');
