const seedSql = `
drop table if exists RequirementCourses;
drop table if exists Requirements;
drop table if exists StreamEnrolments;
drop table if exists Streams;
drop table if exists ProgramEnrolments;
drop table if exists Programs;
drop table if exists CourseEnrolments;
drop table if exists Courses;
drop table if exists Terms;
drop table if exists Subjects;
drop table if exists Staff;
drop table if exists Students;

create table Students (
  zid integer primary key,
  family_name text not null,
  given_names text not null,
  country text not null,
  status text not null
);

create table Subjects (
  code text primary key,
  title text not null,
  uoc integer not null,
  career text not null
);

create table Terms (
  id integer primary key,
  term_code text not null,
  starting text not null
);

create table Staff (
  id integer primary key,
  family_name text not null,
  given_names text not null,
  school text not null
);

create table Courses (
  id integer primary key,
  subject text not null,
  term integer not null,
  convenor integer not null
);

create table CourseEnrolments (
  student integer not null,
  course integer not null,
  mark integer,
  grade text
);

create table Programs (
  code text primary key,
  name text not null
);

create table ProgramEnrolments (
  id integer primary key,
  student integer not null,
  program text not null,
  term integer not null
);

create table Streams (
  code text primary key,
  name text not null
);

create table StreamEnrolments (
  enrolment integer not null,
  stream text not null
);

create table Requirements (
  id integer primary key,
  owner_type text not null,
  owner_code text not null,
  req_type text not null,
  name text not null,
  min_uoc integer not null
);

create table RequirementCourses (
  requirement integer not null,
  subject text not null
);

insert into Students values
  (5000001, 'Nguyen', 'Anh Linh', 'Vietnam', 'INTL'),
  (5000002, 'Patel', 'Riya', 'Australia', 'DOM'),
  (5000003, 'Chen', 'Marcus', 'Singapore', 'INTL'),
  (5000004, 'Smith', 'Jordan', 'Australia', 'DOM'),
  (5000005, 'Ali', 'Noor', 'Pakistan', 'INTL'),
  (5000006, 'Brown', 'Sophie', 'Australia', 'DOM');

insert into Subjects values
  ('COMP1511', 'Programming Fundamentals', 6, 'UG'),
  ('COMP1521', 'Computer Systems Fundamentals', 6, 'UG'),
  ('COMP2521', 'Data Structures and Algorithms', 6, 'UG'),
  ('DBSY2001', 'Database Systems', 6, 'UG'),
  ('COMP3331', 'Computer Networks and Applications', 6, 'UG'),
  ('COMP6714', 'Information Retrieval and Web Search', 6, 'PG'),
  ('MATH1131', 'Mathematics 1A', 6, 'UG'),
  ('INFS1609', 'Information Systems Foundations', 6, 'UG');

insert into Terms values
  (1, '24T1', '2024-02-12'),
  (2, '24T2', '2024-05-27'),
  (3, '24T3', '2024-09-09'),
  (4, '25T1', '2025-02-10');

insert into Staff values
  (2001, 'Miller', 'Ava', 'CSE'),
  (2002, 'Wilson', 'Liam', 'CSE'),
  (2003, 'Taylor', 'Emma', 'CSE'),
  (2004, 'Davis', 'Noah', 'Math');

insert into Courses values
  (101, 'COMP1511', 1, 2001),
  (102, 'COMP1521', 1, 2002),
  (103, 'COMP2521', 2, 2002),
  (104, 'DBSY2001', 2, 2003),
  (105, 'COMP3331', 3, 2001),
  (106, 'MATH1131', 1, 2004),
  (107, 'INFS1609', 2, 2003),
  (108, 'DBSY2001', 4, 2003),
  (109, 'COMP6714', 4, 2002);

insert into CourseEnrolments values
  (5000001, 101, 78, 'DN'),
  (5000001, 102, 74, 'CR'),
  (5000001, 104, 81, 'DN'),
  (5000001, 108, null, null),
  (5000002, 101, 69, 'CR'),
  (5000002, 103, 75, 'DN'),
  (5000002, 104, 68, 'CR'),
  (5000003, 101, 49, 'FL'),
  (5000003, 102, 55, 'PS'),
  (5000003, 104, 72, 'CR'),
  (5000004, 106, 88, 'HD'),
  (5000004, 107, 91, 'HD'),
  (5000004, 108, 84, 'DN'),
  (5000005, 103, 62, 'PS'),
  (5000005, 105, 0, 'FL'),
  (5000006, 101, null, null),
  (5000006, 107, 57, 'PS'),
  (5000006, 108, 65, 'CR');

insert into Programs values
  ('3778', 'Computer Science'),
  ('3707', 'Engineering'),
  ('8543', 'Data Science');

insert into ProgramEnrolments values
  (9001, 5000001, '3778', 1),
  (9002, 5000001, '3778', 2),
  (9003, 5000002, '3778', 1),
  (9004, 5000002, '3778', 2),
  (9005, 5000003, '3707', 1),
  (9006, 5000004, '8543', 2),
  (9007, 5000004, '8543', 4),
  (9008, 5000005, '3707', 2),
  (9009, 5000006, '3778', 4);

insert into Streams values
  ('SENGA1', 'Software Engineering'),
  ('DATAA1', 'Data Systems'),
  ('NETWA1', 'Networks'),
  ('GENEA1', 'General');

insert into StreamEnrolments values
  (9001, 'GENEA1'),
  (9002, 'DATAA1'),
  (9003, 'SENGA1'),
  (9004, 'DATAA1'),
  (9005, 'NETWA1'),
  (9006, 'DATAA1'),
  (9007, 'DATAA1'),
  (9008, 'NETWA1'),
  (9009, 'SENGA1');

insert into Requirements values
  (1, 'program', '3778', 'core', 'Database core', 6),
  (2, 'program', '3778', 'elective', 'Systems elective', 12),
  (3, 'stream', 'DATAA1', 'stream', 'Data stream core', 12);

insert into RequirementCourses values
  (1, 'DBSY2001'),
  (2, 'COMP3331'),
  (2, 'COMP2521'),
  (3, 'DBSY2001'),
  (3, 'COMP6714');
`;

const executableModules = new Set(["Views"]);
