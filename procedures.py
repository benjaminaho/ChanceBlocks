import MySQLdb, json

# SQL text of queries stored separately for easy viewing and editing
with open('static/queries.json') as queries_file:
    query_strings = json.load(queries_file)

# a Query object contains a database connection, cursor, and appropriate methods for CRUD operations
class Query:

    def __init__(self, kind=None):
        self.connection = MySQLdb.connect('host', 'user', 'password', 'database')
        self.cursor = self.connection.cursor()
        self.kind = kind


    def add(self, arg1, arg2):
        queries = query_strings.get("add").get(self.kind)
        self.cursor.execute(queries[0] % (arg1, arg2)) # create record
        self.connection.commit()
        self.cursor.execute(queries[1] % (arg1, arg2)) # read just-created record to verify successful creation
        return self.cursor.fetchone()[0]


    def get(self, what, arg):
        self.cursor.execute(query_strings.get("get").get(self.kind).get(what) % arg) # read record

        # style of return depends on instance variable kind and parameter what
        if self.kind == "user" or (self.kind == "block" and what == "secondary content"):
            return self.cursor.fetchone()
        if self.kind == "report" and (what == "primary content" or what == "secondary content"):
            return self.cursor.fetchall()
        if self.kind == "block" and what == "primary content":
            raw_blocks = self.cursor.fetchall()
            blocks = {}
            for block in raw_blocks:
                blocks[block[0]] = block[1]
            return blocks
        if self.kind == "report" and what == "tertiary content":
            cbs = self.cursor.fetchall()
            contents = []
            self.kind = "block"
            for cb in cbs:
                contents.append((cb[0], self.get("secondary content", cb[0])[0]))
            self.kind = "report"
            return contents


    def update(self, what, arg1, arg2):
        
        # accepts report_id and data; data is an array of objects each of which describes a cb_report_instance for the corresponding report_id
        def update_report_content(self, report_id, data):
            queries = query_strings.get("update").get(self.kind).get("content")

            # retrieve cb_ids in report before update
            self.cursor.execute(queries[0] % report_id)
            old_cb_ids = [cb_id for tup in self.cursor.fetchall() for cb_id in tup]

            # loop populates new_cb_ids for use in next loop; ensures each element in data has a corresponding cb_report_instance, either by creating one or updating the existing one
            new_cb_ids = []
            for i in range(len(data)):
                new_cb_ids.append(int(data[i]["cb_id"]))
                if new_cb_ids[i] not in old_cb_ids:
                    self.cursor.execute(queries[1] % (data[i]["cb_id"], report_id, data[i]["quantity"], data[i]["unique_results"]))
                else:
                    self.cursor.execute(queries[2] % (data[i]["quantity"], data[i]["unique_results"], data[i]["cb_id"], report_id))
                self.connection.commit()
            
            # loop deletes cb_report_instances not included in data
            for j in range(len(old_cb_ids)):
                if old_cb_ids[j] not in new_cb_ids:
                    self.cursor.execute(queries[3] % (old_cb_ids[j], report_id))
                    self.connection.commit()


        if self.kind == "report" and what == "content": # very specific update method for this case
            update_report_content(self, arg1, arg2)
        else: # otherwise execute a single query
            self.cursor.execute(query_strings.get("update").get(self.kind).get(what) % (arg1, arg2)) # update record
            self.connection.commit()


    def remove(self, arg1, arg2):
        self.cursor.execute(query_strings.get("remove").get(self.kind) % (arg1, arg2)) # delete record
        self.connection.commit()


    def __del__(self):
        self.cursor.close()
        self.connection.close()
