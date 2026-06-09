@IsTest
private class AccountServiceTest {

    @IsTest
    static void testGetAccounts() {

        Account acc =
            new Account(
                Name='Test Account'
            );

        insert acc;

        Test.startTest();

        List<Account> result =
            AccountService.getAccounts();

        Test.stopTest();

        System.assert(
            result.size() > 0
        );
    }
}