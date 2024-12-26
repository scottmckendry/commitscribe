import * as path from "path";
import * as assert from "assert";
import * as ttm from "azure-pipelines-task-lib/mock-test";

describe("Sample task tests", function () {
    before(function () {});

    after(() => {});

    it("should succeed with simple inputs", function (done: Mocha.Done) {
        this.timeout(30000);

        let tp: string = path.join(__dirname, "success.js");
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.runAsync()
            .then(() => {
                console.log(tr.succeeded);
                assert.equal(tr.succeeded, true, "should have succeeded");
                assert.equal(
                    tr.warningIssues.length,
                    0,
                    "should have no warnings",
                );
                assert.equal(tr.errorIssues.length, 0, "should have no errors");
                console.log(tr.stdout);
                assert.equal(
                    tr.stdout.indexOf("Hello human") >= 0,
                    true,
                    "should display Hello human",
                );
                done();
            })
            .catch((error) => {
                done(error); // Ensure the test case fails if there's an error
            });
    });

    it("should fail if tool returns 1", function (done: Mocha.Done) {
        this.timeout(30000);

        const tp = path.join(__dirname, "failure.js");
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.runAsync().then(() => {
            console.log(tr.succeeded);
            assert.equal(tr.succeeded, false, "should have failed");
            assert.equal(tr.warningIssues.length, 0, "should have no warnings");
            assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");
            assert.equal(
                tr.errorIssues[0],
                "Bad input was given",
                "error issue output",
            );
            assert.equal(
                tr.stdout.indexOf("Hello bad"),
                -1,
                "Should not display Hello bad",
            );
            done();
        });
    });
});
