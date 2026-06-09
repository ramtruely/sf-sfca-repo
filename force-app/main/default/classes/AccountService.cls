public with sharing class AccountService {

    public static List<Account> getAccounts() {

        return [
            SELECT Id,
                   Name
            FROM Account
            LIMIT 100
        ];
    }
}