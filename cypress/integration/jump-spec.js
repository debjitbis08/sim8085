describe("Jump Instructions", function () {
    describe("JNC", function () {
        it("Should jump to correct location", function () {
            cy.visit("http://localhost:3000");

            // var editor = cy.get('.CodeMirror').CodeMirror;
            var editorP = cy.get('.CodeMirror').its("0.CodeMirror");
            
            editorP.should("exist");
            editorP.then(function (editor) {
                editor.setValue(`
                    jnc start

                    a1: db 07h
                    a2: db 14h

                    mvi b, a1
                    jmp end

                    start: mvi b, a2

                    end: hlt
                `);

                cy.get("[data-automation-id='btn-load']").click();
                cy.get("[data-automation-id='btn-run']").click();
                cy.get("[data-automation-id='val-reg-bc']").should("have.text", "0x1400");

                cy.get("[data-automation-id='val-flg-C']").check();
                cy.get("[data-automation-id='btn-load']").click();
                cy.get("[data-automation-id='btn-run']").click();
                cy.get("[data-automation-id='val-reg-bc']").should("have.text", "0x0700");
            });
        });
    });
});