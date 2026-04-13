const exerciseModules = ["All", "Views", "SQL Functions", "PLpgSQL", "Python + Psycopg"];

const moduleMeta = {
  Views: {
    title: "Views and Query Design",
    summary:
      "Practice shaping reusable relations, preserving zero-count rows, and building clean aggregates over a shared university schema.",
  },
  "SQL Functions": {
    title: "SQL Functions",
    summary:
      "Focus on scalar, set-returning, and table-valued SQL functions with signatures that match reporting and lookup tasks cleanly.",
  },
  PLpgSQL: {
    title: "PLpgSQL",
    summary:
      "Drill procedural control flow, `select into`, loops, validation, and output-helper logic for edge-case-heavy questions.",
  },
  "Python + Psycopg": {
    title: "Python and Psycopg",
    summary:
      "Train the script layer: CLI argument handling, parameterised queries, empty-result checks, and exact report formatting.",
  },
};

const exercises = [
  {
    id: "views-1",
    module: "Views",
    difficulty: "Core",
    title: "View for student transcript rows",
    prompt:
      "Create a view `TranscriptRows` that exposes one row per student-course enrolment with zID, term code, subject code, subject title, mark, grade, and UOC.",
    details:
      "Join `Students`, `CourseEnrolments`, `Courses`, `Subjects`, and `Terms`. Use readable aliases and preserve rows with NULL mark/grade.",
    hint:
      "Start from `CourseEnrolments` and join outward. The view should not aggregate anything.",
    solution: `create or replace view TranscriptRows as
select s.zid,
       t.term_code,
       sub.code as subject_code,
       sub.title as subject_title,
       ce.mark,
       ce.grade,
       sub.uoc
from CourseEnrolments ce
join Students s on s.zid = ce.student
join Courses c on c.id = ce.course
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term;`,
    checks: ["create view", "join", "courseenrolments", "subjects", "terms"],
    examTip: "Views are best when they remove repetitive joins that show up in multiple later questions.",
  },
  {
    id: "views-2",
    module: "Views",
    difficulty: "Core",
    title: "High enrolment course summary view",
    prompt:
      "Define a view `CourseCounts` listing each course id, subject code, term code, and number of enrolled students.",
    details:
      "Group by course-level identifiers. Include courses with zero enrolments if they exist.",
    hint:
      "Use `Courses` as the driving table and a `left join` to enrolments before grouping.",
    solution: `create or replace view CourseCounts as
select c.id as course_id,
       sub.code as subject_code,
       t.term_code,
       count(ce.student) as num_students
from Courses c
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term
left join CourseEnrolments ce on ce.course = c.id
group by c.id, sub.code, t.term_code;`,
    checks: ["create view", "left join", "group by", "count"],
    examTip: "If the spec says zero-count rows must still appear, your base table choice matters.",
  },
  {
    id: "views-3",
    module: "Views",
    difficulty: "Stretch",
    title: "Domestic students view",
    prompt:
      "Create a view `DomesticStudents` returning zID, full_name, and country for students whose status is not `INTL`.",
    details:
      "Construct `full_name` as `family_name || ', ' || given_names`.",
    hint: "This is a selective projection question. Keep it concise.",
    solution: `create or replace view DomesticStudents as
select zid,
       family_name || ', ' || given_names as full_name,
       country
from Students
where status <> 'INTL';`,
    checks: ["create view", "where", "status", "||"],
    examTip: "Some exam questions are simple if you avoid overengineering them.",
  },
  {
    id: "views-4",
    module: "Views",
    difficulty: "Stretch",
    title: "Latest program enrolment per student",
    prompt:
      "Create a view `LatestProgramEnrolment` that returns one row per student with the latest program enrolment, determined by latest term starting date and then largest enrolment id.",
    details:
      "Return student, enrolment id, program code, and term code.",
    hint:
      "A window function with `row_number()` is the cleanest way to encode the tie-break rules.",
    solution: `create or replace view LatestProgramEnrolment as
select student,
       enrolment_id,
       program,
       term_code
from (
  select pe.student,
         pe.id as enrolment_id,
         pe.program,
         t.term_code,
         row_number() over (
           partition by pe.student
           order by t.starting desc, pe.id desc
         ) as rn
  from ProgramEnrolments pe
  join Terms t on t.id = pe.term
) ranked
where rn = 1;`,
    checks: ["create view", "row_number", "partition by", "order by", "where rn = 1"],
    examTip: "When the spec gives a precise tie-break rule, reflect it literally in SQL.",
  },
  {
    id: "views-5",
    module: "Views",
    difficulty: "Exam",
    title: "Subject average mark by term view",
    prompt:
      "Define a view `SubjectTermAverages` that reports subject code, term code, and rounded average mark for each offered subject-term combination, excluding rows where all marks are NULL.",
    details:
      "Use SQL rounding, not application code rounding.",
    hint:
      "Average ignores NULLs already, but a `having count(mark) > 0` is needed to exclude all-NULL groups.",
    solution: `create or replace view SubjectTermAverages as
select sub.code as subject_code,
       t.term_code,
       round(avg(ce.mark)::numeric, 2) as avg_mark
from Courses c
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term
left join CourseEnrolments ce on ce.course = c.id
group by sub.code, t.term_code
having count(ce.mark) > 0;`,
    checks: ["create view", "avg", "round", "having", "count"],
    examTip: "Many database exams care where rounding happens. If the spec says SQL, do it in SQL.",
  },
  {
    id: "views-6",
    module: "Views",
    difficulty: "Exam",
    title: "Requirement bucket helper view",
    prompt:
      "Create a view `RequirementOptions` that pairs each requirement with the subject codes that can satisfy it, exposing requirement id, owner code, requirement type, requirement name, and subject code.",
    details:
      "Join `Requirements` to `RequirementCourses`. This is a helper view for progression logic.",
    hint: "This is mostly projection and renaming for readability.",
    solution: `create or replace view RequirementOptions as
select r.id as requirement_id,
       r.owner_code,
       r.req_type,
       r.name as requirement_name,
       rc.subject as subject_code
from Requirements r
join RequirementCourses rc on rc.requirement = r.id;`,
    checks: ["create view", "requirements", "requirementcourses", "join"],
    examTip: "A helper view is worth writing if it turns repeated requirement joins into one readable relation.",
  },
  {
    id: "sqlf-1",
    module: "SQL Functions",
    difficulty: "Core",
    title: "Function returning student count for a course",
    prompt:
      "Write an SQL function `course_enrolment_count(course_id integer)` returning an integer count of enrolled students.",
    details:
      "Return zero if there are no enrolments.",
    hint: "This is a one-select SQL function. No PLpgSQL needed.",
    solution: `create or replace function course_enrolment_count(course_id integer)
returns integer
language sql
as $$
  select count(*)
  from CourseEnrolments
  where course = course_id;
$$;`,
    checks: ["create or replace function", "returns integer", "language sql", "count"],
    examTip: "If a single SELECT solves it, prefer `language sql` over PLpgSQL.",
  },
  {
    id: "sqlf-2",
    module: "SQL Functions",
    difficulty: "Core",
    title: "Function returning a latest program",
    prompt:
      "Write an SQL function `latest_program(z integer)` returning the latest program code for a student, using term starting date then enrolment id as tie-breakers.",
    details:
      "Return one scalar value.",
    hint:
      "Order the matching enrolments and `limit 1` rather than trying to aggregate the answer.",
    solution: `create or replace function latest_program(z integer)
returns text
language sql
as $$
  select pe.program
  from ProgramEnrolments pe
  join Terms t on t.id = pe.term
  where pe.student = z
  order by t.starting desc, pe.id desc
  limit 1;
$$;`,
    checks: ["create or replace function", "returns", "order by", "limit 1"],
    examTip: "When the answer is 'latest one row', an ordered subquery is usually simpler than a max join.",
  },
  {
    id: "sqlf-3",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Table-valued function for transcript",
    prompt:
      "Write an SQL function `student_transcript(z integer)` that returns a table of term code, subject code, title, mark, grade, and UOC for one student.",
    details:
      "Order by term starting date and then subject code.",
    hint:
      "Use `returns table (...)` and make the output column names explicit in the signature.",
    solution: `create or replace function student_transcript(z integer)
returns table (
  term_code text,
  subject_code text,
  subject_title text,
  mark integer,
  grade text,
  uoc integer
)
language sql
as $$
  select t.term_code,
         sub.code,
         sub.title,
         ce.mark,
         ce.grade,
         sub.uoc
  from CourseEnrolments ce
  join Courses c on c.id = ce.course
  join Subjects sub on sub.code = c.subject
  join Terms t on t.id = c.term
  where ce.student = z
  order by t.starting, sub.code;
$$;`,
    checks: ["returns table", "language sql", "order by", "where ce.student = z"],
    examTip: "A `returns table` signature acts like a contract. Define it clearly before writing the query.",
  },
  {
    id: "sqlf-4",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Average mark for a subject code",
    prompt:
      "Write an SQL function `subject_average(code text)` returning the rounded average mark across all offerings of a subject, ignoring NULL marks.",
    details:
      "Return `numeric` rounded to 2 decimal places.",
    hint: "Join `Courses` to enrolments and filter by subject code.",
    solution: `create or replace function subject_average(code text)
returns numeric
language sql
as $$
  select round(avg(ce.mark)::numeric, 2)
  from Courses c
  join CourseEnrolments ce on ce.course = c.id
  where c.subject = code;
$$;`,
    checks: ["returns numeric", "round", "avg", "where c.subject = code"],
    examTip: "Name collisions matter. If your parameter is `code`, qualify table columns carefully.",
  },
  {
    id: "sqlf-5",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Set-returning function for stream list",
    prompt:
      "Write an SQL function `streams_for_latest_program(z integer)` returning a set of stream codes associated with the student's latest program enrolment.",
    details:
      "Use latest term starting date then largest enrolment id.",
    hint:
      "Find the latest enrolment in a CTE or subquery, then join `StreamEnrolments`.",
    solution: `create or replace function streams_for_latest_program(z integer)
returns setof text
language sql
as $$
  with latest as (
    select pe.id
    from ProgramEnrolments pe
    join Terms t on t.id = pe.term
    where pe.student = z
    order by t.starting desc, pe.id desc
    limit 1
  )
  select se.stream
  from StreamEnrolments se
  join latest l on l.id = se.enrolment
  order by se.stream;
$$;`,
    checks: ["returns setof", "with latest", "order by", "limit 1"],
    examTip: "A small CTE often makes set-returning SQL functions easier to read under time pressure.",
  },
  {
    id: "sqlf-6",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function for requirement deficit",
    prompt:
      "Write an SQL function `remaining_uoc(required integer, completed integer)` returning the remaining UOC but never below zero.",
    details:
      "Keep it pure SQL.",
    hint: "Use `greatest`.",
    solution: `create or replace function remaining_uoc(required integer, completed integer)
returns integer
language sql
as $$
  select greatest(required - completed, 0);
$$;`,
    checks: ["greatest", "returns integer", "language sql"],
    examTip: "Utility functions are easy marks if you keep them mathematically direct.",
  },
  {
    id: "plpgsql-1",
    module: "PLpgSQL",
    difficulty: "Core",
    title: "Pass/fail label function",
    prompt:
      "Write a PLpgSQL function `grade_label(mark integer)` returning `pass`, `fail`, or `unknown` for NULL.",
    details:
      "Treat mark >= 50 as pass.",
    hint: "This is a basic `if / elsif / else` function.",
    solution: `create or replace function grade_label(mark integer)
returns text
language plpgsql
as $$
begin
  if mark is null then
    return 'unknown';
  elsif mark >= 50 then
    return 'pass';
  else
    return 'fail';
  end if;
end;
$$;`,
    checks: ["language plpgsql", "if", "elsif", "return"],
    examTip: "Show control flow clearly. PLpgSQL questions reward readable branches.",
  },
  {
    id: "plpgsql-2",
    module: "PLpgSQL",
    difficulty: "Core",
    title: "Lookup title with SELECT INTO",
    prompt:
      "Write a PLpgSQL function `subject_title_or_unknown(code text)` that looks up a subject title and returns `Unknown subject` when the code does not exist.",
    details:
      "Use `select ... into` and test the result.",
    hint:
      "You can rely on the variable being NULL if no row is found, or use `found` if you prefer.",
    solution: `create or replace function subject_title_or_unknown(code text)
returns text
language plpgsql
as $$
declare
  result text;
begin
  select title into result
  from Subjects
  where Subjects.code = subject_title_or_unknown.code;

  if result is null then
    return 'Unknown subject';
  end if;

  return result;
end;
$$;`,
    checks: ["language plpgsql", "declare", "select", "into", "if"],
    examTip: "Naming collisions are common. Qualify the parameter or rename it.",
  },
  {
    id: "plpgsql-3",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Compute attempted UOC",
    prompt:
      "Write a PLpgSQL function `attempted_uoc(z integer)` that loops through a student's enrolments and sums subject UOC for rows that have a non-NULL grade.",
    details:
      "Return 0 when the student has no matching rows.",
    hint:
      "A `for rec in select ... loop` is a good fit even if SQL could also solve it.",
    solution: `create or replace function attempted_uoc(z integer)
returns integer
language plpgsql
as $$
declare
  total integer := 0;
  rec record;
begin
  for rec in
    select sub.uoc
    from CourseEnrolments ce
    join Courses c on c.id = ce.course
    join Subjects sub on sub.code = c.subject
    where ce.student = z
      and ce.grade is not null
  loop
    total := total + rec.uoc;
  end loop;

  return total;
end;
$$;`,
    checks: ["language plpgsql", "for rec in", "loop", "total :=", "return total"],
    examTip: "Even when set-based SQL is possible, some exam questions specifically want PLpgSQL control flow.",
  },
  {
    id: "plpgsql-4",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Latest WAM-safe summary",
    prompt:
      "Write a PLpgSQL function `wam_status(z integer)` returning text. It should compute attempted UOC and weighted sum, then return `Can't compute WAM` when attempted UOC is zero, otherwise `WAM = ...` with the rounded value.",
    details:
      "Round in SQL or by using a numeric expression inside the function.",
    hint:
      "Use aggregate `select ... into` to fetch both values in one query, then branch on the denominator.",
    solution: `create or replace function wam_status(z integer)
returns text
language plpgsql
as $$
declare
  attempted integer;
  weighted numeric;
  wam numeric;
begin
  select coalesce(sum(sub.uoc), 0),
         coalesce(sum(sub.uoc * coalesce(ce.mark, 0)), 0)
  into attempted, weighted
  from CourseEnrolments ce
  join Courses c on c.id = ce.course
  join Subjects sub on sub.code = c.subject
  where ce.student = z
    and ce.grade is not null;

  if attempted = 0 then
    return 'Can''t compute WAM';
  end if;

  wam := round((weighted / attempted)::numeric, 3);
  return 'WAM = ' || wam;
end;
$$;`,
    checks: ["select", "into", "if attempted = 0", "round", "return"],
    examTip: "Handle the zero-denominator branch explicitly. That is the kind of edge case detailed specs often call out.",
  },
  {
    id: "plpgsql-5",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Requirement allocation helper",
    prompt:
      "Write a PLpgSQL function `can_fill_requirement(done_uoc integer, needed_uoc integer, subject_uoc integer)` returning boolean. It should return true only when adding the subject does not exceed the remaining requirement capacity.",
    details:
      "This is a helper for progression-bucket logic.",
    hint: "Translate the rule literally into an IF statement.",
    solution: `create or replace function can_fill_requirement(done_uoc integer, needed_uoc integer, subject_uoc integer)
returns boolean
language plpgsql
as $$
begin
  if done_uoc >= needed_uoc then
    return false;
  elsif done_uoc + subject_uoc <= needed_uoc then
    return true;
  else
    return false;
  end if;
end;
$$;`,
    checks: ["returns boolean", "language plpgsql", "if", "elsif", "return false"],
    examTip: "For helper logic functions, correctness is more important than terseness.",
  },
  {
    id: "plpgsql-6",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Course existence validator",
    prompt:
      "Write a PLpgSQL function `assert_subject_exists(code text)` that raises an exception with message `Subject <code> not found` when the code is absent; otherwise it returns void.",
    details:
      "Use `if not exists (...)`.",
    hint:
      "This is one of the cleanest patterns for validation logic in PLpgSQL.",
    solution: `create or replace function assert_subject_exists(code text)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from Subjects
    where Subjects.code = assert_subject_exists.code
  ) then
    raise exception 'Subject % not found', code;
  end if;
end;
$$;`,
    checks: ["returns void", "language plpgsql", "if not exists", "raise exception"],
    examTip: "Validation functions are useful when multiple scripts or functions need the same guard.",
  },
  {
    id: "py-1",
    module: "Python + Psycopg",
    difficulty: "Core",
    title: "Parameterised lookup script",
    prompt:
      "Write the core Python/Psycopg code to accept a subject code argument, run a parameterised query for its title and UOC, and print `Subject <code> not found.` when missing.",
    details:
      "Assume the connection object `conn` already exists.",
    hint:
      "Use `%s` placeholders and pass a single-element tuple for the parameter.",
    solution: `import sys

code = sys.argv[1]

with conn.cursor() as cur:
    cur.execute(
        """
        select title, uoc
        from Subjects
        where code = %s
        """,
        (code,),
    )
    row = cur.fetchone()

if row is None:
    print(f"Subject {code} not found.")
else:
    title, uoc = row
    print(f"{code} {title} {uoc}uoc")`,
    checks: ["execute(", "%s", "(code,)", "fetchone", "if row is none"],
    examTip: "Never interpolate user input directly into SQL in Psycopg questions.",
  },
  {
    id: "py-2",
    module: "Python + Psycopg",
    difficulty: "Core",
    title: "Transcript script output loop",
    prompt:
      "Write the Python loop that calls a transcript query and prints each row using strict aligned report formatting.",
    details:
      "Assume `rows` contains tuples `(course_code, term_code, title, mark, grade, uoc)`.",
    hint:
      "Handle NULL-style values with Python `None` checks and print `-` when missing.",
    solution: `for course_code, term_code, title, mark, grade, uoc in rows:
    shown_mark = "-" if mark is None else f"{mark:>3}"
    shown_grade = "-" if grade is None else f"{grade:>2}"
    shown_title = title[:40]
    print(f"{course_code} {term_code} {shown_title:<40}{shown_mark} {shown_grade}  {uoc:2d}uoc")`,
    checks: ["for", "is None", "print(f", ":>3", ":>2"],
    examTip: "Formatting bugs lose easy marks. Reproduce the exact required spacing.",
  },
  {
    id: "py-3",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Compute latest enrolment via SQL, not Python",
    prompt:
      "Write the Python/Psycopg snippet that fetches the latest program enrolment for a student using SQL ordering and `fetchone()`, not Python sorting.",
    details:
      "Assume the zID is stored in `zid`.",
    hint:
      "The SQL should mirror the assignment rule: latest term starting date, then largest enrolment id.",
    solution: `with conn.cursor() as cur:
    cur.execute(
        """
        select pe.id, pe.program, t.term_code
        from ProgramEnrolments pe
        join Terms t on t.id = pe.term
        where pe.student = %s
        order by t.starting desc, pe.id desc
        limit 1
        """,
        (zid,),
    )
    latest = cur.fetchone()`,
    checks: ["order by", "desc", "limit 1", "fetchone", "(zid,)"],
    examTip: "If the database can sort/filter it, do not pull extra rows into Python.",
  },
  {
    id: "py-4",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Argument validation skeleton",
    prompt:
      "Write a Python CLI guard that expects exactly one zID argument and exits with usage text when the count is wrong.",
    details:
      "Keep it exam-simple.",
    hint: "This is mostly `len(sys.argv)` and `sys.exit(1)`.",
    solution: `import sys

if len(sys.argv) != 2:
    print("Usage: ./script zID")
    sys.exit(1)

zid = sys.argv[1]`,
    checks: ["len(sys.argv)", "sys.exit", "Usage:"],
    examTip: "Database exam scripts often specify argument handling precisely. Match it exactly.",
  },
  {
    id: "py-5",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Branch on student vs staff",
    prompt:
      "Write a Python/Psycopg snippet that checks whether a person is a student or staff member and prints the staff-only message when the person is staff.",
    details:
      "Assume `zid` exists and tables `Students` and `Staff` can be checked separately.",
    hint:
      "Two existence queries are acceptable if the schema keeps the roles disjoint.",
    solution: `with conn.cursor() as cur:
    cur.execute("select 1 from Students where zid = %s", (zid,))
    is_student = cur.fetchone() is not None

    cur.execute("select 1 from Staff where id = %s", (zid,))
    is_staff = cur.fetchone() is not None

if not is_student and not is_staff:
    print(f"No one has the zID {zid}.")
elif is_staff:
    print(f"{zid} is a staff member, and not a student.")
else:
    print(f"{zid} is a student.")`,
    checks: ["fetchone()", "is not None", "print(f", "No one has the zID"],
    examTip: "A clear control path beats a clever one. Make the three outcomes explicit.",
  },
  {
    id: "py-6",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Safe filter query execution",
    prompt:
      "Write a Python snippet that executes a prebuilt SQL string `query` with parameter list `params`, fetches all rows, and prints the no-match message when the result set is empty.",
    details:
      "This matches the pattern used by filtering/listing scripts.",
    hint: "Keep the execution generic and avoid mixing SQL building with output logic.",
    solution: `with conn.cursor() as cur:
    cur.execute(query, params)
    rows = cur.fetchall()

if not rows:
    print("There are no subjects that match the conditions.")
else:
    print(f"{'Code':<10}{'Title':<55}{'UoC':>5}{'Career':>10}")
    for code, title, uoc, career in rows:
        shown_title = title if len(title) <= 55 else title[:52] + "..."
        print(f"{code:<10}{shown_title:<55}{uoc:>5}{career:>10}")`,
    checks: ["execute(query, params)", "fetchall", "if not rows", "print(f"],
    examTip: "Separate query execution, empty-set handling, and output formatting into distinct steps.",
  },
  {
    id: "views-7",
    module: "Views",
    difficulty: "Core",
    title: "View of staff convenors per course",
    prompt: "Create `CourseConvenors` with course id, subject code, term code, and convenor full name.",
    details: "Join `Courses`, `Subjects`, `Terms`, and `Staff`.",
    hint: "Build the full name in SQL using concatenation.",
    solution: `create or replace view CourseConvenors as
select c.id as course_id,
       sub.code as subject_code,
       t.term_code,
       st.family_name || ', ' || st.given_names as convenor_name
from Courses c
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term
join Staff st on st.id = c.convenor;`,
    checks: ["create view", "join", "staff", "||"],
    examTip: "Simple reporting views are often the foundation for later aggregates.",
  },
  {
    id: "views-8",
    module: "Views",
    difficulty: "Core",
    title: "View of failed enrolments",
    prompt: "Create `FailedEnrolments` for rows where the mark is below 50 or the grade is `FL`.",
    details: "Return student, course, mark, and grade.",
    hint: "Combine mark and grade logic with `or`.",
    solution: `create or replace view FailedEnrolments as
select student, course, mark, grade
from CourseEnrolments
where mark < 50 or grade = 'FL';`,
    checks: ["create view", "where", "or", "grade"],
    examTip: "Read the specification carefully: grade rules and mark rules are not always identical.",
  },
  {
    id: "views-9",
    module: "Views",
    difficulty: "Stretch",
    title: "View of student subject attempts",
    prompt: "Create `StudentSubjectAttempts` showing one row per student-subject pair with the number of attempts.",
    details: "Join through courses and group by student and subject.",
    hint: "Count rows in `CourseEnrolments`, not distinct subjects.",
    solution: `create or replace view StudentSubjectAttempts as
select ce.student,
       c.subject as subject_code,
       count(*) as attempts
from CourseEnrolments ce
join Courses c on c.id = ce.course
group by ce.student, c.subject;`,
    checks: ["create view", "count", "group by", "join"],
    examTip: "Aggregation questions become easier if you first identify the grain of the output rows.",
  },
  {
    id: "views-10",
    module: "Views",
    difficulty: "Stretch",
    title: "View of subject offerings",
    prompt: "Create `SubjectOfferings` with one row per subject per term in which it was offered.",
    details: "Return subject code, term code, and course id.",
    hint: "This is mostly a projection over `Courses` joined to `Terms`.",
    solution: `create or replace view SubjectOfferings as
select c.subject as subject_code,
       t.term_code,
       c.id as course_id
from Courses c
join Terms t on t.id = c.term;`,
    checks: ["create view", "join", "terms", "courses"],
    examTip: "Use helper views to keep later functions free of boilerplate joins.",
  },
  {
    id: "views-11",
    module: "Views",
    difficulty: "Stretch",
    title: "View of completed courses",
    prompt: "Create `CompletedCourses` that keeps only enrolments with passing grades and exposes student, subject code, term code, and UOC.",
    details: "Assume a passing grade means `mark >= 50` for this practice question.",
    hint: "Join to `Subjects` to get UOC.",
    solution: `create or replace view CompletedCourses as
select ce.student,
       sub.code as subject_code,
       t.term_code,
       sub.uoc
from CourseEnrolments ce
join Courses c on c.id = ce.course
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term
where ce.mark >= 50;`,
    checks: ["create view", "where", "mark >= 50", "subjects"],
    examTip: "State your pass rule precisely when the schema does not encode it directly.",
  },
  {
    id: "views-12",
    module: "Views",
    difficulty: "Stretch",
    title: "View of international students",
    prompt: "Create `InternationalStudents` listing zID, country, and full name for students whose status is `INTL`.",
    details: "Keep the output sorted later, not inside the view.",
    hint: "Avoid `order by` in simple view definitions unless the question explicitly requires it.",
    solution: `create or replace view InternationalStudents as
select zid,
       country,
       family_name || ', ' || given_names as full_name
from Students
where status = 'INTL';`,
    checks: ["create view", "where", "INTL", "||"],
    examTip: "Views define relations; output order belongs in the consuming query unless explicitly required.",
  },
  {
    id: "views-13",
    module: "Views",
    difficulty: "Exam",
    title: "View of term WAM contributions",
    prompt: "Create `TermWAMInputs` exposing student, term code, subject code, attempted UOC, and weighted mark contribution.",
    details: "Treat NULL mark as 0 in the weighted contribution.",
    hint: "Use `coalesce(mark, 0)` and join through to subjects.",
    solution: `create or replace view TermWAMInputs as
select ce.student,
       t.term_code,
       sub.code as subject_code,
       sub.uoc as attempted_uoc,
       sub.uoc * coalesce(ce.mark, 0) as weighted_mark
from CourseEnrolments ce
join Courses c on c.id = ce.course
join Subjects sub on sub.code = c.subject
join Terms t on t.id = c.term
where ce.grade is not null;`,
    checks: ["create view", "coalesce", "uoc", "weighted_mark"],
    examTip: "Encode the arithmetic in SQL once so the script layer just consumes rows.",
  },
  {
    id: "views-14",
    module: "Views",
    difficulty: "Exam",
    title: "View of stream membership",
    prompt: "Create `ProgramStreams` that lists student, program code, stream code, and term code for each program enrolment and attached stream.",
    details: "Join `ProgramEnrolments`, `StreamEnrolments`, and `Terms`.",
    hint: "Join on enrolment id, not student id.",
    solution: `create or replace view ProgramStreams as
select pe.student,
       pe.program,
       se.stream,
       t.term_code
from ProgramEnrolments pe
join StreamEnrolments se on se.enrolment = pe.id
join Terms t on t.id = pe.term;`,
    checks: ["create view", "streamenrolments", "programenrolments", "join"],
    examTip: "Progression questions usually hinge on modelling enrolment-level state correctly.",
  },
  {
    id: "views-15",
    module: "Views",
    difficulty: "Exam",
    title: "View of subject career totals",
    prompt: "Create `CareerSubjectTotals` with career and the number of subjects in that career.",
    details: "One row per career.",
    hint: "This is a basic group-by count.",
    solution: `create or replace view CareerSubjectTotals as
select career,
       count(*) as num_subjects
from Subjects
group by career;`,
    checks: ["create view", "count", "group by", "career"],
    examTip: "Straightforward aggregates are easy marks. Do not bury them in unnecessary complexity.",
  },
  {
    id: "views-16",
    module: "Views",
    difficulty: "Exam",
    title: "View of students without program enrolments",
    prompt: "Create `StudentsMissingPrograms` listing students who have no rows in `ProgramEnrolments`.",
    details: "Return zID and full name.",
    hint: "A `left join` with `where pe.id is null` is one clear approach.",
    solution: `create or replace view StudentsMissingPrograms as
select s.zid,
       s.family_name || ', ' || s.given_names as full_name
from Students s
left join ProgramEnrolments pe on pe.student = s.zid
where pe.id is null;`,
    checks: ["create view", "left join", "is null", "programenrolments"],
    examTip: "Anti-join patterns show up often. Recognise both `not exists` and `left join ... is null`.",
  },
  {
    id: "views-17",
    module: "Views",
    difficulty: "Exam",
    title: "View of zero-mark rows",
    prompt: "Create `ZeroMarkRows` containing enrolments whose mark is 0 and grade is not NULL.",
    details: "Return student, course, mark, grade.",
    hint: "Keep the filter exact.",
    solution: `create or replace view ZeroMarkRows as
select student, course, mark, grade
from CourseEnrolments
where mark = 0
  and grade is not null;`,
    checks: ["create view", "mark = 0", "grade is not null"],
    examTip: "Be precise with NULL checks. `= null` is not valid SQL logic.",
  },
  {
    id: "views-18",
    module: "Views",
    difficulty: "Exam",
    title: "View of program counts by term",
    prompt: "Create `ProgramCountsByTerm` with term code, program code, and number of program enrolments.",
    details: "Group by term and program.",
    hint: "Join to `Terms` only for the readable term code.",
    solution: `create or replace view ProgramCountsByTerm as
select t.term_code,
       pe.program,
       count(*) as num_enrolments
from ProgramEnrolments pe
join Terms t on t.id = pe.term
group by t.term_code, pe.program;`,
    checks: ["create view", "count", "group by", "program"],
    examTip: "The output columns tell you the exact group-by grain you need.",
  },
  {
    id: "views-19",
    module: "Views",
    difficulty: "Exam",
    title: "View of subject convenor workloads",
    prompt: "Create `ConvenorLoads` showing each staff member and the number of courses they convene.",
    details: "Include staff with zero courses.",
    hint: "Use `Staff` as the base table.",
    solution: `create or replace view ConvenorLoads as
select st.id,
       st.family_name || ', ' || st.given_names as staff_name,
       count(c.id) as num_courses
from Staff st
left join Courses c on c.convenor = st.id
group by st.id, st.family_name, st.given_names;`,
    checks: ["create view", "left join", "count", "group by"],
    examTip: "When zero rows must survive, pick the preserved side of the join carefully.",
  },
  {
    id: "views-20",
    module: "Views",
    difficulty: "Exam",
    title: "View of subject titles truncated for reports",
    prompt: "Create `SubjectReportTitles` that returns subject code and a report title truncated to 40 characters.",
    details: "Use SQL string functions.",
    hint: "A simple `substring(title from 1 for 40)` is enough here.",
    solution: `create or replace view SubjectReportTitles as
select code,
       substring(title from 1 for 40) as report_title
from Subjects;`,
    checks: ["create view", "substring", "from 1 for 40"],
    examTip: "Sometimes formatting is part of the database layer, especially when specs demand exact output fields.",
  },
  {
    id: "sqlf-7",
    module: "SQL Functions",
    difficulty: "Core",
    title: "Function for full student name",
    prompt: "Write `student_full_name(z integer)` returning `Family, Given`.",
    details: "Return a single text value.",
    hint: "This is a single-row lookup in `Students`.",
    solution: `create or replace function student_full_name(z integer)
returns text
language sql
as $$
  select family_name || ', ' || given_names
  from Students
  where zid = z;
$$;`,
    checks: ["returns text", "language sql", "where zid = z", "||"],
    examTip: "SQL functions are ideal for clean scalar lookups.",
  },
  {
    id: "sqlf-8",
    module: "SQL Functions",
    difficulty: "Core",
    title: "Function returning stream count",
    prompt: "Write `stream_count(enrolment_id integer)` returning the number of streams attached to a program enrolment.",
    details: "Use `StreamEnrolments`.",
    hint: "Count rows filtered by enrolment id.",
    solution: `create or replace function stream_count(enrolment_id integer)
returns integer
language sql
as $$
  select count(*)
  from StreamEnrolments
  where enrolment = enrolment_id;
$$;`,
    checks: ["returns integer", "language sql", "count", "where enrolment = enrolment_id"],
    examTip: "Name parameters so the function body stays readable.",
  },
  {
    id: "sqlf-9",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Function returning term average for a course",
    prompt: "Write `course_average(course_id integer)` returning the rounded average mark for that course.",
    details: "Ignore NULL marks.",
    hint: "Aggregate directly on `CourseEnrolments`.",
    solution: `create or replace function course_average(course_id integer)
returns numeric
language sql
as $$
  select round(avg(mark)::numeric, 2)
  from CourseEnrolments
  where course = course_id;
$$;`,
    checks: ["returns numeric", "round", "avg", "where course = course_id"],
    examTip: "Keep the SQL body narrow. Wider joins are unnecessary when one table already holds the measure.",
  },
  {
    id: "sqlf-10",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Setof subject codes for a term",
    prompt: "Write `subjects_in_term(term_id integer)` returning a set of subject codes offered in that term.",
    details: "Order by subject code.",
    hint: "Use `returns setof text`.",
    solution: `create or replace function subjects_in_term(term_id integer)
returns setof text
language sql
as $$
  select subject
  from Courses
  where term = term_id
  order by subject;
$$;`,
    checks: ["returns setof", "language sql", "where term = term_id", "order by"],
    examTip: "For single-column lists, `setof text` is usually enough.",
  },
  {
    id: "sqlf-11",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Function returning staff load",
    prompt: "Write `staff_load(staff_id integer)` returning how many courses the staff member convenes.",
    details: "Return integer.",
    hint: "Count rows in `Courses`.",
    solution: `create or replace function staff_load(staff_id integer)
returns integer
language sql
as $$
  select count(*)
  from Courses
  where convenor = staff_id;
$$;`,
    checks: ["returns integer", "language sql", "count", "where convenor = staff_id"],
    examTip: "Do not introduce joins unless they supply columns you actually need.",
  },
  {
    id: "sqlf-12",
    module: "SQL Functions",
    difficulty: "Stretch",
    title: "Function returning student country",
    prompt: "Write `student_country(z integer)` returning the student's country.",
    details: "Simple scalar function.",
    hint: "One-table lookup.",
    solution: `create or replace function student_country(z integer)
returns text
language sql
as $$
  select country
  from Students
  where zid = z;
$$;`,
    checks: ["returns text", "language sql", "country", "where zid = z"],
    examTip: "Small helper functions can make bigger report queries cleaner.",
  },
  {
    id: "sqlf-13",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning program enrolment rows",
    prompt: "Write `program_history(z integer)` returning a table of term code and program code for a student.",
    details: "Order chronologically.",
    hint: "Join `ProgramEnrolments` to `Terms` and use `returns table`.",
    solution: `create or replace function program_history(z integer)
returns table (term_code text, program_code text)
language sql
as $$
  select t.term_code, pe.program
  from ProgramEnrolments pe
  join Terms t on t.id = pe.term
  where pe.student = z
  order by t.starting, pe.id;
$$;`,
    checks: ["returns table", "join terms", "order by", "where pe.student = z"],
    examTip: "Chronological history functions should express their ordering rule explicitly.",
  },
  {
    id: "sqlf-14",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning subjects by career",
    prompt: "Write `subjects_for_career(c text)` returning a table of subject code and title for one career.",
    details: "Order by code.",
    hint: "Filter in `Subjects` and project the needed columns.",
    solution: `create or replace function subjects_for_career(c text)
returns table (code text, title text)
language sql
as $$
  select s.code, s.title
  from Subjects s
  where s.career = c
  order by s.code;
$$;`,
    checks: ["returns table", "language sql", "where s.career = c", "order by"],
    examTip: "Table-valued functions are often just parameterised views.",
  },
  {
    id: "sqlf-15",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function for boolean subject existence",
    prompt: "Write `subject_exists(code text)` returning boolean.",
    details: "Return whether the subject code exists.",
    hint: "Use `exists (select 1 ...)`.",
    solution: `create or replace function subject_exists(code text)
returns boolean
language sql
as $$
  select exists (
    select 1
    from Subjects s
    where s.code = subject_exists.code
  );
$$;`,
    checks: ["returns boolean", "exists", "select 1", "language sql"],
    examTip: "Boolean SQL functions are concise and useful as guards.",
  },
  {
    id: "sqlf-16",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning subject count for a program history",
    prompt: "Write `num_courses_for_student(z integer)` returning the number of course enrolments for a student.",
    details: "Count enrolment rows.",
    hint: "The base table is already `CourseEnrolments`.",
    solution: `create or replace function num_courses_for_student(z integer)
returns integer
language sql
as $$
  select count(*)
  from CourseEnrolments
  where student = z;
$$;`,
    checks: ["returns integer", "count", "where student = z", "language sql"],
    examTip: "Be clear whether the question wants courses, subjects, or enrolment rows.",
  },
  {
    id: "sqlf-17",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning non-null mark count",
    prompt: "Write `marked_rows(course_id integer)` returning the number of enrolments with non-NULL marks for a course.",
    details: "Return integer.",
    hint: "Filter on `mark is not null`.",
    solution: `create or replace function marked_rows(course_id integer)
returns integer
language sql
as $$
  select count(*)
  from CourseEnrolments
  where course = course_id
    and mark is not null;
$$;`,
    checks: ["returns integer", "mark is not null", "count", "language sql"],
    examTip: "Counting non-NULL measures is a common prerequisite for safe averages.",
  },
  {
    id: "sqlf-18",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning domestic students",
    prompt: "Write `domestic_students()` returning a table of zID and country for students whose status is not `INTL`.",
    details: "No parameters.",
    hint: "This is a parameterless table-valued function.",
    solution: `create or replace function domestic_students()
returns table (zid integer, country text)
language sql
as $$
  select s.zid, s.country
  from Students s
  where s.status <> 'INTL';
$$;`,
    checks: ["returns table", "status <>", "INTL", "language sql"],
    examTip: "Parameterless SQL functions can encapsulate reusable subsets cleanly.",
  },
  {
    id: "sqlf-19",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning remaining mark gap",
    prompt: "Write `marks_to_hd(mark integer)` returning how many marks are needed to reach 85, but never below zero.",
    details: "Use SQL arithmetic.",
    hint: "This is another `greatest` pattern.",
    solution: `create or replace function marks_to_hd(mark integer)
returns integer
language sql
as $$
  select greatest(85 - coalesce(mark, 0), 0);
$$;`,
    checks: ["greatest", "coalesce", "returns integer", "language sql"],
    examTip: "Small arithmetic functions are good practice for getting used to SQL expressions.",
  },
  {
    id: "sqlf-20",
    module: "SQL Functions",
    difficulty: "Exam",
    title: "Function returning latest term code",
    prompt: "Write `latest_term_code()` returning the term code with the greatest starting date.",
    details: "Return one text value.",
    hint: "Order descending and limit one.",
    solution: `create or replace function latest_term_code()
returns text
language sql
as $$
  select term_code
  from Terms
  order by starting desc
  limit 1;
$$;`,
    checks: ["returns text", "order by starting desc", "limit 1", "language sql"],
    examTip: "When 'latest' is defined by a date column, express that directly.",
  },
  {
    id: "plpgsql-7",
    module: "PLpgSQL",
    difficulty: "Core",
    title: "Return domestic/international label",
    prompt: "Write `student_kind(status text)` returning `Domestic` unless the status is `INTL`.",
    details: "Return text.",
    hint: "One simple IF is enough.",
    solution: `create or replace function student_kind(status text)
returns text
language plpgsql
as $$
begin
  if status = 'INTL' then
    return 'International';
  end if;
  return 'Domestic';
end;
$$;`,
    checks: ["language plpgsql", "if", "return", "INTL"],
    examTip: "PLpgSQL does not need to be elaborate when the logic is small.",
  },
  {
    id: "plpgsql-8",
    module: "PLpgSQL",
    difficulty: "Core",
    title: "Null-safe mark display",
    prompt: "Write `show_mark(mark integer)` returning `-` for NULL or the mark as text otherwise.",
    details: "Return text.",
    hint: "Cast the integer to text in the non-NULL branch.",
    solution: `create or replace function show_mark(mark integer)
returns text
language plpgsql
as $$
begin
  if mark is null then
    return '-';
  end if;
  return mark::text;
end;
$$;`,
    checks: ["language plpgsql", "if mark is null", "return '-'", "::text"],
    examTip: "Output helper functions are useful for report-style scripting tasks.",
  },
  {
    id: "plpgsql-9",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Count program enrolments",
    prompt: "Write `program_enrolment_count(z integer)` in PLpgSQL using `select into` and return the count.",
    details: "Return integer.",
    hint: "Even though SQL would do, practice `select into` here.",
    solution: `create or replace function program_enrolment_count(z integer)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  select count(*) into n
  from ProgramEnrolments
  where student = z;
  return n;
end;
$$;`,
    checks: ["language plpgsql", "declare", "select count(*) into", "return n"],
    examTip: "PLpgSQL exams often test whether you know the mechanics, not whether SQL alone would suffice.",
  },
  {
    id: "plpgsql-10",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Find latest term for a student",
    prompt: "Write `latest_student_term(z integer)` using `select into` and ordering logic.",
    details: "Return term code text or NULL if absent.",
    hint: "Use `order by t.starting desc, pe.id desc limit 1`.",
    solution: `create or replace function latest_student_term(z integer)
returns text
language plpgsql
as $$
declare
  answer text;
begin
  select t.term_code
  into answer
  from ProgramEnrolments pe
  join Terms t on t.id = pe.term
  where pe.student = z
  order by t.starting desc, pe.id desc
  limit 1;

  return answer;
end;
$$;`,
    checks: ["language plpgsql", "select", "into answer", "order by", "limit 1"],
    examTip: "A top-1 ordered query plus `select into` is a very common pattern.",
  },
  {
    id: "plpgsql-11",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Accumulate total marks",
    prompt: "Write `sum_marks(z integer)` looping over all non-NULL marks for a student and returning their sum.",
    details: "Use a `for rec in select` loop.",
    hint: "Filter NULL marks in the loop query to keep the body simple.",
    solution: `create or replace function sum_marks(z integer)
returns integer
language plpgsql
as $$
declare
  total integer := 0;
  rec record;
begin
  for rec in
    select mark
    from CourseEnrolments
    where student = z
      and mark is not null
  loop
    total := total + rec.mark;
  end loop;
  return total;
end;
$$;`,
    checks: ["language plpgsql", "for rec in", "mark is not null", "total :="],
    examTip: "Filter early and keep loop bodies trivial.",
  },
  {
    id: "plpgsql-12",
    module: "PLpgSQL",
    difficulty: "Stretch",
    title: "Raise exception on missing student",
    prompt: "Write `assert_student_exists(z integer)` that raises `No one has the zID <z>.` when absent.",
    details: "Return void.",
    hint: "Use `if not exists` and `raise exception`.",
    solution: `create or replace function assert_student_exists(z integer)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from Students
    where zid = z
  ) then
    raise exception 'No one has the zID %.', z;
  end if;
end;
$$;`,
    checks: ["returns void", "if not exists", "raise exception", "language plpgsql"],
    examTip: "Validation helpers are worth practicing because they combine SQL tests with procedural control flow.",
  },
  {
    id: "plpgsql-13",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Boolean pass helper",
    prompt: "Write `is_pass(mark integer)` returning true when mark is at least 50 and false otherwise, including NULL.",
    details: "Return boolean.",
    hint: "Put the NULL case first.",
    solution: `create or replace function is_pass(mark integer)
returns boolean
language plpgsql
as $$
begin
  if mark is null then
    return false;
  elsif mark >= 50 then
    return true;
  else
    return false;
  end if;
end;
$$;`,
    checks: ["returns boolean", "language plpgsql", "mark is null", "elsif mark >= 50"],
    examTip: "Specs often define NULL behaviour separately. Make it explicit.",
  },
  {
    id: "plpgsql-14",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Requirement deficit string",
    prompt: "Write `requirement_status(done integer, needed integer)` returning either `Complete` or `<n> UOC remaining`.",
    details: "Return text.",
    hint: "Branch on `done >= needed`.",
    solution: `create or replace function requirement_status(done integer, needed integer)
returns text
language plpgsql
as $$
begin
  if done >= needed then
    return 'Complete';
  end if;
  return (needed - done) || ' UOC remaining';
end;
$$;`,
    checks: ["returns text", "language plpgsql", "if done >= needed", "return"],
    examTip: "Text-building logic is common in progression-style reporting functions.",
  },
  {
    id: "plpgsql-15",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Normalize title length",
    prompt: "Write `report_title(t text)` returning the title unchanged if length <= 55 or truncated with `...` otherwise.",
    details: "Return text.",
    hint: "Use `length` and `substring`.",
    solution: `create or replace function report_title(t text)
returns text
language plpgsql
as $$
begin
  if length(t) <= 55 then
    return t;
  end if;
  return substring(t from 1 for 52) || '...';
end;
$$;`,
    checks: ["length", "substring", "|| '...'", "language plpgsql"],
    examTip: "This mirrors the report-formatting logic that often appears in Python script specs.",
  },
  {
    id: "plpgsql-16",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Loop over streams and count",
    prompt: "Write `count_streams_for_student(z integer)` using a loop to count stream enrolment rows for the latest program enrolment.",
    details: "Use an ordered subquery for the latest enrolment id.",
    hint: "Get the latest enrolment id first, then loop over matching stream rows.",
    solution: `create or replace function count_streams_for_student(z integer)
returns integer
language plpgsql
as $$
declare
  latest_id integer;
  total integer := 0;
  rec record;
begin
  select pe.id
  into latest_id
  from ProgramEnrolments pe
  join Terms t on t.id = pe.term
  where pe.student = z
  order by t.starting desc, pe.id desc
  limit 1;

  for rec in
    select stream
    from StreamEnrolments
    where enrolment = latest_id
  loop
    total := total + 1;
  end loop;

  return total;
end;
$$;`,
    checks: ["declare", "latest_id", "for rec in", "total := total + 1", "language plpgsql"],
    examTip: "Break multi-step procedural logic into small, obvious stages.",
  },
  {
    id: "plpgsql-17",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Default missing grade",
    prompt: "Write `show_grade(g text)` returning `-` when the grade is NULL.",
    details: "Return text.",
    hint: "This is the grade companion to a mark-display helper.",
    solution: `create or replace function show_grade(g text)
returns text
language plpgsql
as $$
begin
  if g is null then
    return '-';
  end if;
  return g;
end;
$$;`,
    checks: ["language plpgsql", "if g is null", "return '-'", "return g"],
    examTip: "Tiny formatting helpers are good procedural warmups before harder questions.",
  },
  {
    id: "plpgsql-18",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Check if subject is postgraduate",
    prompt: "Write `is_postgrad_subject(code text)` that looks up the career and returns true iff it is `PG`.",
    details: "Use `select into`.",
    hint: "Fetch the career string into a variable, then compare it.",
    solution: `create or replace function is_postgrad_subject(code text)
returns boolean
language plpgsql
as $$
declare
  c text;
begin
  select career into c
  from Subjects
  where Subjects.code = is_postgrad_subject.code;

  return c = 'PG';
end;
$$;`,
    checks: ["returns boolean", "select career into", "return c = 'PG'", "language plpgsql"],
    examTip: "A scalar lookup followed by a boolean return is one of the cleanest PLpgSQL patterns.",
  },
  {
    id: "plpgsql-19",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Guard against overfill",
    prompt: "Write `remaining_after_fill(done integer, need integer, add_uoc integer)` returning the new remaining UOC if valid, else the old remaining UOC.",
    details: "Use procedural branching.",
    hint: "Compare `done + add_uoc` against `need`.",
    solution: `create or replace function remaining_after_fill(done integer, need integer, add_uoc integer)
returns integer
language plpgsql
as $$
begin
  if done + add_uoc <= need then
    return need - (done + add_uoc);
  end if;
  return need - done;
end;
$$;`,
    checks: ["returns integer", "if done + add_uoc <= need", "return need -", "language plpgsql"],
    examTip: "Translate the rule directly; avoid clever algebra if it makes the branch less obvious.",
  },
  {
    id: "plpgsql-20",
    module: "PLpgSQL",
    difficulty: "Exam",
    title: "Generate no-match text",
    prompt: "Write `subject_match_message(n integer)` returning the standard no-match line when `n = 0`, else `Matches found`.",
    details: "Return text.",
    hint: "Simple IF/ELSE.",
    solution: `create or replace function subject_match_message(n integer)
returns text
language plpgsql
as $$
begin
  if n = 0 then
    return 'There are no subjects that match the conditions.';
  end if;
  return 'Matches found';
end;
$$;`,
    checks: ["returns text", "if n = 0", "return 'There are no subjects", "language plpgsql"],
    examTip: "Exact required output strings are worth memorising and practicing.",
  },
  {
    id: "py-7",
    module: "Python + Psycopg",
    difficulty: "Core",
    title: "Open a connection",
    prompt: "Write the Psycopg connection line for a local database named `studentdb`.",
    details: "Assume `psycopg2` is imported.",
    hint: "Keep it minimal and realistic for a command-line revision script.",
    solution: `conn = psycopg2.connect("dbname=studentdb")`,
    checks: ["connect", "dbname=studentdb"],
    examTip: "Know the minimal connection form so you do not burn exam time on setup trivia.",
  },
  {
    id: "py-8",
    module: "Python + Psycopg",
    difficulty: "Core",
    title: "Fetch all subject rows",
    prompt: "Write the cursor code to fetch all subject codes and titles ordered by code.",
    details: "Assume `conn` exists.",
    hint: "Use a context-managed cursor and `fetchall()`.",
    solution: `with conn.cursor() as cur:
    cur.execute(
        """
        select code, title
        from Subjects
        order by code
        """
    )
    rows = cur.fetchall()`,
    checks: ["with conn.cursor()", "execute(", "order by code", "fetchall"],
    examTip: "Memorise the Psycopg cursor pattern until it is automatic.",
  },
  {
    id: "py-9",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Print a header only on matches",
    prompt: "Write the Python conditional that prints the subject listing header only when `rows` is non-empty.",
    details: "Assume `rows` is a list of tuples.",
    hint: "This is an `if rows:` pattern.",
    solution: `if rows:
    print(f"{'Code':<10}{'Title':<55}{'UoC':>5}{'Career':>10}")
else:
    print("There are no subjects that match the conditions.")`,
    checks: ["if rows", "print(f", "There are no subjects that match the conditions."],
    examTip: "Exact empty-set behaviour is usually specified and easy to lose marks on.",
  },
  {
    id: "py-10",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Single-row unpack",
    prompt: "Write the Python code that unpacks `row` into `title` and `uoc` only after checking for `None`.",
    details: "Use clear branching.",
    hint: "Guard before unpacking.",
    solution: `if row is None:
    print("Not found.")
else:
    title, uoc = row
    print(title, uoc)`,
    checks: ["if row is None", "title, uoc = row", "else"],
    examTip: "Never unpack a fetch result before handling the no-row case.",
  },
  {
    id: "py-11",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Close the connection safely",
    prompt: "Write the Python line that closes the database connection once the script is finished.",
    details: "Keep it simple.",
    hint: "This is just one method call.",
    solution: `conn.close()`,
    checks: ["conn.close()"],
    examTip: "Even when not assessed directly, clean connection handling reflects good discipline.",
  },
  {
    id: "py-12",
    module: "Python + Psycopg",
    difficulty: "Stretch",
    title: "Parameter tuple for one value",
    prompt: "Write the exact parameter tuple passed to Psycopg when the only argument is `zid`.",
    details: "This is a syntax detail people often miss.",
    hint: "One-element tuples need a trailing comma.",
    solution: `(zid,)`,
    checks: ["(zid,)"],
    examTip: "The missing trailing comma in one-element tuples is a classic avoidable bug.",
  },
  {
    id: "py-13",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Query then branch on empty result list",
    prompt: "Write the Python/Psycopg pattern that fetches all stream rows for an enrolment and prints `No streams` when empty.",
    details: "Assume the enrolment id is `enrolment_id`.",
    hint: "Execute, fetchall, then branch.",
    solution: `with conn.cursor() as cur:
    cur.execute(
        "select stream from StreamEnrolments where enrolment = %s order by stream",
        (enrolment_id,),
    )
    rows = cur.fetchall()

if not rows:
    print("No streams")
else:
    for (stream,) in rows:
        print(stream)`,
    checks: ["fetchall", "(enrolment_id,)", "if not rows", "for (stream,) in rows"],
    examTip: "Keep the SQL/result handling flow linear and obvious.",
  },
  {
    id: "py-14",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Truncate long title in Python",
    prompt: "Write the Python expression that truncates a title to 55 chars using 52 plus `...` when needed.",
    details: "This mirrors common database-course report specs.",
    hint: "Use a conditional expression.",
    solution: `shown_title = title if len(title) <= 55 else title[:52] + "..."`,
    checks: ["len(title) <= 55", "title[:52] + \"...\""],
    examTip: "Exact formatting logic should become muscle memory.",
  },
  {
    id: "py-15",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Print aligned faculty summary row",
    prompt: "Write the f-string that prints `type_name`, `num_schools`, and `num_staff` in the assignment-style layout.",
    details: "Use left/right alignment.",
    hint: "Mirror the spec exactly.",
    solution: `print(f"{type_name:<40}{num_schools:>8}{num_staff:>7}")`,
    checks: ["print(f", "{type_name:<40}", "{num_schools:>8}", "{num_staff:>7}"],
    examTip: "Exact f-strings are often worth memorising because they are specification-driven.",
  },
  {
    id: "py-16",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Catch database errors",
    prompt: "Write a minimal `try/except` wrapper around a query that prints `Database error` if Psycopg raises an exception.",
    details: "Assume the query body goes inside the `try` block.",
    hint: "Use `except Exception:` for the exam-safe broad form.",
    solution: `try:
    with conn.cursor() as cur:
        cur.execute("select 1")
        row = cur.fetchone()
except Exception:
    print("Database error")`,
    checks: ["try:", "except Exception", "print(\"Database error\")"],
    examTip: "If the spec does not ask for rich error handling, keep it narrow and readable.",
  },
  {
    id: "py-17",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Read semicolon filter argument",
    prompt: "Write the line that stores the raw filter condition string from the only command-line argument.",
    details: "Assume CLI count has already been checked.",
    hint: "This is just indexing into `sys.argv`.",
    solution: `raw_filters = sys.argv[1]`,
    checks: ["sys.argv[1]"],
    examTip: "Keep argument parsing separate from database logic.",
  },
  {
    id: "py-18",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Use fetchone existence test",
    prompt: "Write the expression that converts a `fetchone()` result into a boolean named `exists`.",
    details: "Assume `row = cur.fetchone()` has just run.",
    hint: "Use an identity check.",
    solution: `exists = row is not None`,
    checks: ["row is not None"],
    examTip: "Be explicit. Truthiness hacks make result handling harder to read.",
  },
  {
    id: "py-19",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Loop over unpacked transcript tuples",
    prompt: "Write the `for` line that unpacks transcript rows into six variables.",
    details: "The tuple shape is `(subject_code, term_code, title, mark, grade, uoc)`.",
    hint: "The loop header itself is the key thing here.",
    solution: `for subject_code, term_code, title, mark, grade, uoc in rows:`,
    checks: ["for subject_code, term_code, title, mark, grade, uoc in rows:"],
    examTip: "Write unpacking loops cleanly; cluttered tuple indexing wastes time and clarity.",
  },
  {
    id: "py-20",
    module: "Python + Psycopg",
    difficulty: "Exam",
    title: "Commit after write",
    prompt: "Write the Python line that commits the current transaction after an update statement.",
    details: "Useful for mixed SQL/Python practicals.",
    hint: "One method call on the connection.",
    solution: `conn.commit()`,
    checks: ["conn.commit()"],
    examTip: "Even if your final focuses on reads, knowing the transaction boundary API is still useful.",
  },
];
